#!/usr/bin/env python3
from __future__ import annotations
import csv, html, json, math, os, re, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

BASE='https://www.growtent.pl/'
SEARCH=urljoin(BASE,'search.php')
OUT=Path(os.getenv('OUTPUT_DIR','operator-artifacts/growtent-fast'))
WORKERS=max(4,min(int(os.getenv('WORKERS','24')),32))
UA='Mozilla/5.0 (compatible; LabucoCatalogList/2.0)'
PRODUCT_RE=re.compile(r'/product-(?:pol|eng)-(\d+)-.+\.html',re.I)
PRICE_RE=re.compile(r'(?<!\d)(\d[\d\s\u00a0]*[,.]\d{2})\s*zł',re.I)

client=httpx.Client(headers={'User-Agent':UA,'Accept-Language':'pl-PL,pl;q=0.9'},timeout=30,follow_redirects=True,http2=True)

def get(url:str)->str:
    last=None
    for i in range(4):
        try:
            r=client.get(url)
            if r.status_code in (429,500,502,503,504):
                raise RuntimeError(f'HTTP {r.status_code}')
            r.raise_for_status(); return r.text
        except Exception as e:
            last=e; time.sleep(min(2**i,6))
    raise RuntimeError(f'GET failed {url}: {last}')

def clean(s:str)->str:
    return re.sub(r'\s+',' ',html.unescape(s or '')).strip()

def abs_url(v:str,base:str)->str:
    if not v:return ''
    v=v.split(',')[0].strip().split(' ')[0]
    if v.startswith('//'): return 'https:'+v
    return urljoin(base,v)

def product_from_anchor(a, page_url):
    href=abs_url(a.get('href',''),page_url)
    m=PRODUCT_RE.search(urlparse(href).path)
    if not m:return None
    title=clean(a.get_text(' ',strip=True))
    if not title or len(title)<3:return None
    node=a
    chosen=None
    for _ in range(8):
        node=node.parent
        if not node: break
        text=clean(node.get_text(' ',strip=True))
        imgs=node.find_all(['img','source']) if hasattr(node,'find_all') else []
        if imgs and PRICE_RE.search(text):
            chosen=node; break
    chosen=chosen or a.parent
    text=clean(chosen.get_text(' ',strip=True)) if chosen else title
    pm=PRICE_RE.search(text)
    price=pm.group(1).replace('\u00a0',' ').strip() if pm else ''
    image=''
    if chosen:
        for img in chosen.find_all(['img','source']):
            val=img.get('data-src') or img.get('data-original') or img.get('src') or img.get('srcset') or ''
            u=abs_url(val,page_url)
            low=u.lower()
            if u.startswith('http') and not any(x in low for x in ('logo','icon','sprite','payment','banner')):
                image=u; break
    return {'id':m.group(1),'title':title,'price_pln':price,'url':href,'image':image}

def parse_page(counter:int):
    url=SEARCH if counter==0 else f'{SEARCH}?counter={counter}'
    soup=BeautifulSoup(get(url),'lxml')
    rows={}
    for a in soup.find_all('a',href=True):
        p=product_from_anchor(a,url)
        if p:
            old=rows.get(p['id'])
            if old is None or (not old.get('image') and p.get('image')):
                rows[p['id']]=p
    return counter,list(rows.values())

def write_all(rows:list[dict], total_expected:int, pages_done:int, pages_total:int):
    OUT.mkdir(parents=True,exist_ok=True)
    rows=sorted({r['id']:r for r in rows}.values(), key=lambda r:int(r['id']))
    (OUT/'products.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
    with (OUT/'products.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=['id','title','price_pln','url','image']);w.writeheader();w.writerows(rows)
    cards=[]
    for r in rows:
        img=f'<img loading="lazy" src="{html.escape(r["image"],quote=True)}" alt="">' if r['image'] else '<div class="noimg">brak zdjęcia</div>'
        cards.append(f'<article>{img}<div class="p"><b>{html.escape(r["title"])}</b><span>{html.escape(r["price_pln"])} zł</span><a href="{html.escape(r["url"],quote=True)}" target="_blank">Produkt</a></div></article>')
    doc='''<!doctype html><meta charset="utf-8"><title>GrowTent – lista produktów</title><style>body{font-family:Arial;margin:20px;background:#f4f4f4}.top{position:sticky;top:0;background:#fff;padding:12px;z-index:2}.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}article{background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 5px #0002}img,.noimg{width:100%;height:220px;object-fit:contain;background:#fff}.noimg{display:grid;place-items:center;color:#777}.p{padding:12px;display:grid;gap:8px}.p span{font-size:18px}.p a{color:#0645ad}</style>'''+f'<div class="top"><h1>GrowTent – {len(rows)} produktów</h1><div>Strony: {pages_done}/{pages_total} • oczekiwane wg sklepu: {total_expected}</div></div><div class="g">'+''.join(cards)+'</div>'
    (OUT/'products.html').write_text(doc,encoding='utf-8')
    summary={'products':len(rows),'products_with_images':sum(bool(r['image']) for r in rows),'expected_products':total_expected,'pages_done':pages_done,'pages_total':pages_total,'generated_at_utc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
    (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    return summary

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    first=get(SEARCH)
    m=re.search(r'ilość\s+produktów\s*:\s*(\d+)',first,re.I)
    total=int(m.group(1)) if m else 0
    pages=max(1,math.ceil(total/20)) if total else 240
    all_rows=[]; errors=[]; done=0
    # Parse page 0 from already fetched HTML.
    soup=BeautifulSoup(first,'lxml'); d={}
    for a in soup.find_all('a',href=True):
        p=product_from_anchor(a,SEARCH)
        if p:d[p['id']]=p
    all_rows.extend(d.values()); done=1
    write_all(all_rows,total,done,pages)
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        fs={ex.submit(parse_page,i):i for i in range(1,pages)}
        for fut in as_completed(fs):
            i=fs[fut]
            try:
                _,rows=fut.result(); all_rows.extend(rows)
            except Exception as e:
                errors.append(f'page {i}: {e}')
            done+=1
            if done%10==0 or done==pages:
                s=write_all(all_rows,total,done,pages)
                print(f'PROGRESS pages={done}/{pages} products={s["products"]} images={s["products_with_images"]} errors={len(errors)}',flush=True)
    s=write_all(all_rows,total,done,pages)
    (OUT/'errors.log').write_text('\n'.join(errors),encoding='utf-8')
    print('SUMMARY',json.dumps(s,ensure_ascii=False),flush=True)
    return 0 if s['products'] else 2

if __name__=='__main__':
    raise SystemExit(main())
