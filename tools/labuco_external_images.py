#!/usr/bin/env python3
from __future__ import annotations
import json, os, re, urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from io import BytesIO
import requests
from PIL import Image
from ddgs import DDGS

SRC_ROOT=Path(os.getenv('INPUT_ROOT','source'))
OUT=Path(os.getenv('OUTPUT_DIR','artifacts/labuco-images'))
IDX=int(os.getenv('CHUNK_INDEX','0')); CNT=int(os.getenv('CHUNK_COUNT','16'))
WORKERS=max(1,min(6,int(os.getenv('WORKERS','3'))))
OWNED={'growtent','royalroom','herbgarden™','herbgarden','verticana®','verticana','luckygrow','croco fan','croco filters','croco','galaxyfarm®','galaxyfarm'}
UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36'
BAD_DOMAINS={'growtent.pl','www.growtent.pl','duckduckgo.com','bing.com','google.com','images.google.com'}
MARKETPLACES=('allegro.','amazon.','ebay.','aliexpress.','temu.','etsy.')

def norm(s): return (s or '').strip().lower()
def base_title(row):
    m=re.search(r'product-pol-\d+-(.+?)\.html',row.get('url',''))
    s=m.group(1) if m else (row.get('title') or '')
    return re.sub(r'\s+',' ',urllib.parse.unquote(s).replace('-',' ')).strip()
def host(u):
    try: return urllib.parse.urlparse(u).netloc.lower().split(':')[0]
    except Exception: return ''
def brand_token(s): return re.sub(r'[^a-z0-9]+','',norm(s))[:18]

def score_result(r,brand,title):
    img=r.get('image') or ''; src=r.get('url') or r.get('source') or ''
    h=host(img); sh=host(src)
    if not img or h in BAD_DOMAINS or h.endswith('.growtent.pl') or sh.endswith('growtent.pl'): return -999
    text=' '.join([r.get('title') or '',img,src]).lower(); score=0
    bt=brand_token(brand)
    if bt and bt in re.sub(r'[^a-z0-9]+','',text): score+=8
    words=[w.lower() for w in re.findall(r'[A-Za-z0-9]{4,}',title)[:8]]
    score+=sum(1 for w in words if w in text)
    if any(m in h for m in MARKETPLACES) or any(m in sh for m in MARKETPLACES): score-=4
    if 'cdn' in h or 'media' in h or 'image' in h: score+=1
    return score

def download_image(url,destbase):
    r=requests.get(url,headers={'User-Agent':UA,'Referer':'https://www.google.com/'},timeout=20,allow_redirects=True)
    r.raise_for_status()
    if len(r.content)<5000: raise ValueError('image too small')
    im=Image.open(BytesIO(r.content)); im.verify(); im=Image.open(BytesIO(r.content))
    w,h=im.size
    if w<250 or h<250: raise ValueError(f'image dimensions too small {w}x{h}')
    fmt=(im.format or 'JPEG').lower(); ext={'jpeg':'.jpg','jpg':'.jpg','png':'.png','webp':'.webp','gif':'.gif'}.get(fmt,'.jpg')
    path=destbase.with_suffix(ext); path.write_bytes(r.content)
    return path,w,h

def process(row):
    pid=str(row.get('id') or ''); brand=(row.get('producer') or '').strip(); title=base_title(row); sku=f'LAB-{pid.zfill(5)}'
    result={'labuco_sku':sku,'source_id':pid,'brand':brand,'title':title,'status':'DO_GENERACJI','external_image_url':'','external_page_url':'','external_domain':'','local_image':'','width':0,'height':0,'error':''}
    try:
        candidates=[]
        with DDGS() as ddgs:
            for q in [f'"{brand}" {title} product image',f'{brand} {title} official']:
                try: candidates.extend(list(ddgs.images(q,max_results=8)))
                except Exception: pass
                if candidates: break
        for cand in sorted(candidates,key=lambda r:score_result(r,brand,title),reverse=True)[:8]:
            if score_result(cand,brand,title)<0: continue
            try:
                img=cand.get('image') or ''; dest=OUT/'images'/sku; dest.parent.mkdir(parents=True,exist_ok=True)
                p,w,h=download_image(img,dest)
                result.update({'status':'ZEWNETRZNE_ZDJECIE','external_image_url':img,'external_page_url':cand.get('url') or cand.get('source') or '','external_domain':host(cand.get('url') or cand.get('source') or img),'local_image':str(p.relative_to(OUT)),'width':w,'height':h})
                return result
            except Exception as e: result['error']=str(e)
        result['error']=result['error'] or 'no acceptable external image'
    except Exception as e: result['error']=str(e)
    return result

def load_rows():
    rows=[]
    files=list(SRC_ROOT.rglob('products.json'))
    for fp in files:
        try: rows.extend(json.loads(fp.read_text(encoding='utf-8')))
        except Exception as e: print(f'WARN {fp}: {e}',flush=True)
    uniq={str(r.get('id')):r for r in rows if str(r.get('id') or '')}
    rows=list(uniq.values())
    return [r for r in rows if norm(r.get('producer')) not in OWNED and norm(r.get('producer')) not in {'','unidentified'}]

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    rows=load_rows(); selected=[r for n,r in enumerate(rows) if n%CNT==IDX]
    print(f'all={len(rows)} chunk={IDX}/{CNT} products={len(selected)} workers={WORKERS}',flush=True)
    done=[]
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        fs=[ex.submit(process,r) for r in selected]
        for n,f in enumerate(as_completed(fs),1):
            done.append(f.result())
            if n%20==0 or n==len(selected):
                ok=sum(x['status']=='ZEWNETRZNE_ZDJECIE' for x in done)
                print(f'progress={n}/{len(selected)} external={ok} generate={n-ok}',flush=True)
    done.sort(key=lambda x:int(x['source_id']) if x['source_id'].isdigit() else 10**18)
    (OUT/'image_manifest.json').write_text(json.dumps(done,ensure_ascii=False,indent=2),encoding='utf-8')
    summary={'chunk':IDX+1,'chunks':CNT,'products':len(done),'external_images':sum(x['status']=='ZEWNETRZNE_ZDJECIE' for x in done),'to_generate':sum(x['status']!='ZEWNETRZNE_ZDJECIE' for x in done)}
    (OUT/'summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
    print('SUMMARY',json.dumps(summary,ensure_ascii=False),flush=True)
if __name__=='__main__': main()
