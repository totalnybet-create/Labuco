from __future__ import annotations
import asyncio, os
from pathlib import Path
from typing import Any
import httpx
from playwright.async_api import async_playwright


def _secret(value: Any) -> Any:
    if isinstance(value,str) and value.startswith('env:'):
        name=value[4:]; resolved=os.getenv(name)
        if resolved is None: raise RuntimeError(f'Required environment secret is missing: {name}')
        return resolved
    if isinstance(value,dict): return {k:_secret(v) for k,v in value.items()}
    if isinstance(value,list): return [_secret(v) for v in value]
    return value

class BrowserSession:
    def __init__(self, artifacts:str):
        self.artifacts=Path(artifacts); self.artifacts.mkdir(parents=True,exist_ok=True); self.pw=self.browser=self.context=self.page=None
    async def start(self):
        if self.page:return
        self.pw=await async_playwright().start(); cdp=os.getenv('BROWSER_CDP_URL','').strip()
        if cdp:
            self.browser=await self.pw.chromium.connect_over_cdp(cdp, no_defaults=True)
            self.context=self.browser.contexts[0] if self.browser.contexts else await self.browser.new_context(accept_downloads=True)
        else:
            profile=os.getenv('BROWSER_PROFILE_DIR','./data/browser-profile'); Path(profile).mkdir(parents=True,exist_ok=True)
            self.context=await self.pw.chromium.launch_persistent_context(profile,headless=os.getenv('BROWSER_HEADLESS','1')!='0',accept_downloads=True)
        self.page=self.context.pages[0] if self.context.pages else await self.context.new_page()
    async def close(self):
        try:
            if self.context and not self.browser: await self.context.close()
            elif self.browser: await self.browser.close()
        finally:
            if self.pw: await self.pw.stop()
            self.pw=self.browser=self.context=self.page=None
    async def locator(self,args):
        p=self.page
        if args.get('role') and args.get('name'):
            loc=p.get_by_role(args['role'],name=args['name'])
            if await loc.count(): return loc.first
        if args.get('text'):
            loc=p.get_by_text(args['text'],exact=bool(args.get('exact',False)))
            if await loc.count(): return loc.first
        selectors=args.get('selectors') or [args.get('selector')]
        for selector in [x for x in selectors if x]:
            loc=p.locator(selector)
            if await loc.count(): return loc.first
        raise RuntimeError('No matching locator found for provided selector/text/role fallbacks')
    async def run(self,action,args,task_id,step_index,timeout_s):
        await self.start(); p=self.page; p.set_default_timeout(timeout_s*1000)
        if action=='browser.goto': await p.goto(args['url'],wait_until=args.get('wait_until','domcontentloaded')); return {'url':p.url,'title':await p.title()}
        if action=='browser.click': await (await self.locator(args)).click(); return {'url':p.url}
        if action=='browser.fill':
            value=os.getenv(args['value_env']) if args.get('value_env') else _secret(args.get('value',''))
            if args.get('value_env') and value is None: raise RuntimeError(f"Required environment secret is missing: {args['value_env']}")
            await (await self.locator(args)).fill(str(value)); return {'url':p.url}
        if action=='browser.press': await (await self.locator(args)).press(args['key']); return {'url':p.url}
        if action=='browser.screenshot':
            path=self.artifacts/f'{task_id}-{step_index}.png'; await p.screenshot(path=str(path),full_page=bool(args.get('full_page',True))); return {'path':str(path),'url':p.url}
        if action=='browser.download':
            async with p.expect_download() as info: await (await self.locator(args)).click()
            d=await info.value; path=self.artifacts/(args.get('filename') or d.suggested_filename); await d.save_as(str(path)); return {'path':str(path)}
        raise ValueError(f'Unsupported browser action: {action}')

async def shell_exec(args,timeout_s):
    cmd=str(args['command']); cwd=args.get('cwd') or './workspace'; Path(cwd).mkdir(parents=True,exist_ok=True)
    proc=await asyncio.create_subprocess_exec('/bin/bash','-lc',cmd,cwd=cwd,stdout=asyncio.subprocess.PIPE,stderr=asyncio.subprocess.PIPE,env={**os.environ,'PATH':os.environ.get('PATH','')})
    try: out,err=await asyncio.wait_for(proc.communicate(),timeout=timeout_s)
    except asyncio.TimeoutError:
        proc.kill(); await proc.wait(); raise TimeoutError(f'shell timeout after {timeout_s}s')
    result={'exit_code':proc.returncode,'stdout':out.decode(errors='replace')[-20000:],'stderr':err.decode(errors='replace')[-20000:]}
    if proc.returncode!=0: raise RuntimeError(str(result))
    return result

async def http_request(args,timeout_s):
    method=str(args.get('method','GET')).upper(); headers=_secret(args.get('headers',{})); payload=_secret(args.get('json')) if 'json' in args else None
    async with httpx.AsyncClient(timeout=timeout_s,follow_redirects=bool(args.get('follow_redirects',True))) as c:
        r=await c.request(method,args['url'],headers=headers,json=payload,params=args.get('params'))
        content_type=r.headers.get('content-type','')
        body=r.json() if 'application/json' in content_type else r.text[:20000]
        if r.status_code>=400: raise RuntimeError(f'HTTP {r.status_code}: {str(body)[:2000]}')
        return {'status_code':r.status_code,'url':str(r.url),'body':body}

async def github_cancel(args,timeout_s):
    token=(os.getenv('GITHUB_OPERATOR_TOKEN') or os.getenv('GITHUB_TOKEN') or '').strip()
    if not token: raise RuntimeError('GITHUB_OPERATOR_TOKEN/GITHUB_TOKEN is not configured')
    owner=args['owner']; repo=args['repo']; run_id=int(args['run_id'])
    url=f'https://api.github.com/repos/{owner}/{repo}/actions/runs/{run_id}/cancel'
    headers={'Authorization':f'Bearer {token}','Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'}
    async with httpx.AsyncClient(timeout=timeout_s) as c:
        r=await c.post(url,headers=headers)
        if r.status_code not in (202,409): raise RuntimeError(f'GitHub {r.status_code}: {r.text[:1000]}')
        return {'status_code':r.status_code,'accepted':r.status_code==202}
