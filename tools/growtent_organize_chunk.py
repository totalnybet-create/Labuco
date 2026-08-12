#!/usr/bin/env python3
from __future__ import annotations
import csv, html, json, os
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict
from pathlib import Path
from urllib.parse import urlparse
from growtent_catalog_importer import parse_public_product, safe_filename, get

SRC=Path(os.getenv('INPUT_JSON','source/products.json'))
OUT=Path(os.getenv('OUTPUT_DIR','artifacts/growtent-organized'))
IDX=int(os.getenv('CHUNK_INDEX','0')); CNT=int(os.getenv('CHUNK_COUNT','8'))
WORKERS=max(1,min(8,int(os.getenv('WORKERS','4'))))

def save_image(url, folder):
    if not url: return '', 'NO_IMAGE_URL'
    try:
        r=get(url,binary=True)
        ext=Path(urlparse(r.url).path).suffix.lower()
        ctype=(r.headers.get('content-type') or '').split(';',1)[0].lower()
        if ext not in {'.jpg','.jpeg','.png','.webp','.gif','.avif'}:
            ext={'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif','image/avif':'.avif'}.get(ctype,'.jpg')
        dst=folder/('zdjecie'+ext)
        dst.write_bytes(r.content)
        return dst.name,''
    except Exception as e:
        return '',str(e)

def work(row):
    pid=str(row.get('id') or '')
    title=row.get('title') or ''
    base={'id':pid,'title':title,'price_pln':row.get('price_pln',''),'url':row.get('url',''),'image':row.get('image','')}
    try:
        p=parse_public_product(base['url'])
        desc=p.long_description or p.short_description or title
        short=p.short_description or desc[:500]
        image=base['image'] or (p.images[0] if p.images else '')
        folder=OUT/'products'/f"{safe_filename(pid)}_{safe_filename(title)}"
        folder.mkdir(parents=True,exist_ok=True)
        local,image_error=save_image(image,folder)
        result={**base,'description_short':short,'description_long':desc,'producer':p.producer,'sku':p.sku,'ean':p.ean,'availability':p.availability,'categories':p.categories,'attributes':p.attributes,'image':image,'local_image':local,'status':'ok' if desc and image and local else 'needs_review','error':image_error}
        (folder/'opis.txt').write_text(desc,encoding='utf-8')
        (folder/'produkt.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        return result
    except Exception as e:
        return {**base,'description_short':'','description_long':'','producer':'','sku':'','ean':'','availability':'','categories':[],'attributes':{},'local_image':'','status':'needs_review','error':str(e)}

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
            if n%25==0 or n==len(selected): print(f'progress={n}/{len(selected)}',flush=True)
    done.sort(key=lambda r:int(r['id']) if str(r.get('id','')).isdigit() else 10**18)
    (OUT/'products.json').write_text(json.dumps(done,ensure_ascii=False,indent=2),encoding='utf-8')
    fields=['id','title','price_pln','url','image','local_image','description_short','description_long','producer','sku','ean','availability','categories','attributes','status','error']
    with (OUT/'products.csv').open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=fields); w.writeheader()
        for r in done:
            q=dict(r); q['categories']=' | '.join(q.get('categories',[])); q['attributes']=json.dumps(q.get('attributes',{}),ensure_ascii=False); w.writerow(q)
    bad=[r for r in done if r['status']!='ok']
    (OUT/'needs_review.json').write_text(json.dumps(bad,ensure_ascii=False,indent=2),encoding='utf-8')
    cards=[]
    for r in done:
        cards.append(f"<article><img loading='lazy' src='{html.escape(r.get('image',''))}'><h3>{html.escape(r.get('title',''))}</h3><b>{html.escape(r.get('price_pln',''))} zł</b><p>{html.escape((r.get('description_short') or r.get('description_long') or '')[:450])}</p><small>ID {html.escape(r.get('id',''))} · {r['status']}</small></article>")
    page="<!doctype html><meta charset='utf-8'><style>body{font-family:system-ui;background:#f4f4ef;color:#173126}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}article{background:#fff;padding:12px;border-radius:14px}img{width:100%;height:220px;object-fit:contain}p{font-size:13px}</style><h1>GrowTent – paczka %s</h1><main>%s</main>"%(IDX+1,''.join(cards))
    (OUT/'index.html').write_text(page,encoding='utf-8')
    summary={'chunk':IDX+1,'chunks':CNT,'products':len(done),'ok':sum(x['status']=='ok' for x in done),'needs_review':len(bad),'with_description':sum(bool(x['description_long']) for x in done),'with_local_image':sum(bool(x['local_image']) for x in done)}
    (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    print('SUMMARY',json.dumps(summary,ensure_ascii=False),flush=True)
if __name__=='__main__': main()
