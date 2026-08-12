#!/usr/bin/env python3
from __future__ import annotations
import csv, html, json, os, re, threading, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

SRC=Path(os.getenv('INPUT_JSON','source/products.json'))
OUT=Path(os.getenv('OUTPUT_DIR','artifacts/growtent-organized'))
IDX=int(os.getenv('CHUNK_INDEX','0')); CNT=int(os.getenv('CHUNK_COUNT','12'))
WORKERS=max(1,min(8,int(os.getenv('WORKERS','4'))))
TIMEOUT=15
_tls=threading.local()

def sess():
    s=getattr(_tls,'s',None)
    if s is None:
        s=requests.Session(); s.headers.update({'User-Agent':'LabucoCatalogOrganizer/2.0','Accept-Language':'pl-PL,pl;q=0.9,en;q=0.5'})
        _tls.s=s
    return s

def get(url,retries=3):
    last=None
    for n in range(retries):
        try:
            r=sess().get(url,timeout=TIMEOUT,allow_redirects=True)
            if r.status_code in {429,500,502,503,504}: raise requests.HTTPError(f'HTTP {r.status_code}')
            r.raise_for_status(); return r
        except Exception as e:
            last=e; time.sleep(min(0.6*(2**n),3))
    raise RuntimeError(str(last))

def clean(v):
    if not v: return ''
    return re.sub(r'\s+',' ',BeautifulSoup(html.unescape(str(v)),'html.parser').get_text(' ',strip=True)).strip()

def safe(v):
    v=re.sub(r'[^A-Za-z0-9._-]+','-',str(v)).strip('-.')
    return v[:90] or 'produkt'

def product_ld(soup):
    for node in soup.find_all('script',attrs={'type':'application/ld+json'}):
        try: data=json.loads(node.string or node.get_text() or '')
        except Exception: continue
        items=data if isinstance(data,list) else [data]
        expanded=[]
        for x in items:
            if isinstance(x,dict) and isinstance(x.get('@graph'),list): expanded.extend(x['@graph'])
            expanded.append(x)
        for x in expanded:
            if not isinstance(x,dict): continue
            t=x.get('@type'); types=t if isinstance(t,list) else [t]
            if any(str(z).lower()=='product' for z in types): return x
    return {}

def extract_desc(soup,ld,title):
    for sel in ['#projector_longdescription','.projector_longdescription','#product_description','.product_description','.projector_description','[data-description=long]']:
        el=soup.select_one(sel)
        if el:
            t=clean(el.decode_contents())
            if len(t)>=30: return t
    t=clean(ld.get('description',''))
    if len(t)>=20: return t
    meta=soup.find('meta',attrs={'name':re.compile('description',re.I)})
    t=clean(meta.get('content','')) if meta else ''
    return t or title

def save_image(url,folder):
    if not url: return '', 'NO_IMAGE_URL'
    try:
        r=get(url)
        ext=Path(urlparse(r.url).path).suffix.lower()
        ctype=(r.headers.get('content-type') or '').split(';',1)[0].lower()
        if ext not in {'.jpg','.jpeg','.png','.webp','.gif','.avif'}:
            ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/avif':'.avif'}.get(ctype,'.jpg')
        dst=folder/('zdjecie'+ext); dst.write_bytes(r.content); return dst.name,''
    except Exception as e: return '',str(e)

def work(row):
    pid=str(row.get('id') or ''); title=row.get('title') or ''; url=row.get('url') or ''; image=row.get('image') or ''
    base={'id':pid,'title':title,'price_pln':row.get('price_pln',''),'url':url,'image':image}
    folder=OUT/'products'/f"{safe(pid)}_{safe(title)}"; folder.mkdir(parents=True,exist_ok=True)
    try:
        r=get(url); soup=BeautifulSoup(r.text,'lxml'); ld=product_ld(soup)
        desc=extract_desc(soup,ld,title)
        meta=soup.find('meta',attrs={'name':re.compile('description',re.I)})
        short=clean(meta.get('content','')) if meta else ''
        short=short or clean(ld.get('description',''))[:500] or desc[:500]
        brand=ld.get('brand'); producer=clean(brand.get('name')) if isinstance(brand,dict) else clean(brand)
        sku=clean(ld.get('sku')); ean=clean(ld.get('gtin13') or ld.get('gtin') or ld.get('gtin14') or ld.get('gtin8'))
        local,imgerr=save_image(image,folder)
        result={**base,'description_short':short,'description_long':desc,'producer':producer,'sku':sku,'ean':ean,'local_image':local,'status':'ok' if desc and image and local else 'needs_review','error':imgerr}
    except Exception as e:
        result={**base,'description_short':'','description_long':'','producer':'','sku':'','ean':'','local_image':'','status':'needs_review','error':str(e)}
    (folder/'opis.txt').write_text(result.get('description_long') or title,encoding='utf-8')
    (folder/'produkt.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    return result

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    rows=json.loads(SRC.read_text(encoding='utf-8'))
    selected=[r for n,r in enumerate(rows) if n%CNT==IDX]
    print(f'chunk={IDX}/{CNT} products={len(selected)} workers={WORKERS}',flush=True)
    done=[]
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        fs=[ex.submit(work,r) for r in selected]
        for n,f in enumerate(as_completed(fs),1):
            done.append(f.result())
            if n%25==0 or n==len(selected): print(f'progress={n}/{len(selected)} ok={sum(x["status"]=="ok" for x in done)}',flush=True)
    done.sort(key=lambda r:int(r['id']) if str(r.get('id','')).isdigit() else 10**18)
    (OUT/'products.json').write_text(json.dumps(done,ensure_ascii=False,indent=2),encoding='utf-8')
    fields=['id','title','price_pln','url','image','local_image','description_short','description_long','producer','sku','ean','status','error']
    with (OUT/'products.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader(); w.writerows(done)
    bad=[r for r in done if r['status']!='ok']
    (OUT/'needs_review.json').write_text(json.dumps(bad,ensure_ascii=False,indent=2),encoding='utf-8')
    cards=[f"<article><img loading='lazy' src='{html.escape(r.get('image',''))}'><h3>{html.escape(r.get('title',''))}</h3><b>{html.escape(r.get('price_pln',''))} zł</b><p>{html.escape((r.get('description_short') or r.get('description_long') or '')[:450])}</p><small>ID {html.escape(r.get('id',''))} · {r['status']}</small></article>" for r in done]
    page="<!doctype html><meta charset='utf-8'><style>body{font-family:system-ui;background:#f4f4ef;color:#173126}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}article{background:#fff;padding:12px;border-radius:14px}img{width:100%;height:220px;object-fit:contain}p{font-size:13px}</style><h1>GrowTent – paczka %s</h1><main>%s</main>"%(IDX+1,''.join(cards))
    (OUT/'index.html').write_text(page,encoding='utf-8')
    summary={'chunk':IDX+1,'chunks':CNT,'products':len(done),'ok':sum(x['status']=='ok' for x in done),'needs_review':len(bad),'with_description':sum(bool(x['description_long']) for x in done),'with_local_image':sum(bool(x['local_image']) for x in done)}
    (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    print('SUMMARY',json.dumps(summary,ensure_ascii=False),flush=True)
if __name__=='__main__': main()
