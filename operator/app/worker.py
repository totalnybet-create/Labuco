from __future__ import annotations
import asyncio, os, threading, time
from .executors import BrowserSession, github_cancel, http_request, shell_exec
from .models import Risk, Step, TaskStatus
from .policy import effective_risk
from .store import Store

class Worker:
    def __init__(self,store:Store,artifacts='data/artifacts'):
        self.store=store; self.artifacts=artifacts; self.stop_evt=threading.Event(); self.thread=None; self.watchdog_thread=None
        self.stale_seconds=max(120,int(os.getenv('OPERATOR_STUCK_SECONDS','1200')))
    def start(self):
        if self.thread and self.thread.is_alive():return
        self.stop_evt.clear()
        self.thread=threading.Thread(target=self._thread,daemon=True,name='operator-worker'); self.thread.start()
        self.watchdog_thread=threading.Thread(target=self._watchdog,daemon=True,name='operator-watchdog'); self.watchdog_thread.start()
    def stop(self): self.stop_evt.set()
    def _thread(self): asyncio.run(self.loop())
    def _watchdog(self):
        while not self.stop_evt.wait(30): self.store.mark_stale_running(self.stale_seconds)
    async def loop(self):
        while not self.stop_evt.is_set():
            task=self.store.next_queued()
            if not task: await asyncio.sleep(.5); continue
            await self.execute(task['id'])
    async def execute_step(self,browser:BrowserSession,step:Step,tid:str,i:int):
        if step.action.startswith('browser.'): return await browser.run(step.action,step.args,tid,i,step.timeout_s)
        if step.action=='shell.exec': return await shell_exec(step.args,step.timeout_s)
        if step.action=='http.request': return await http_request(step.args,step.timeout_s)
        if step.action=='github.cancel_workflow': return await github_cancel(step.args,step.timeout_s)
        raise ValueError(step.action)
    async def execute(self,tid):
        browser=BrowserSession(self.artifacts)
        self.store.update(tid,status=TaskStatus.running.value); self.store.event(tid,'start','Task started')
        try:
            while True:
                task=self.store.get(tid)
                if not task or task['status']!=TaskStatus.running.value:return
                i=task['current_step']; steps=task['steps']
                if i>=len(steps): self.store.update(tid,status=TaskStatus.completed.value); self.store.event(tid,'completed','Task completed'); return
                step=Step.model_validate(steps[i]); risk=effective_risk(step)
                if risk==Risk.deny:
                    self.store.update(tid,status=TaskStatus.failed.value,last_error=f'Denied by policy at step {i}'); self.store.event(tid,'denied',step.label or step.action); return
                if risk==Risk.confirm and task['approved_step']!=i:
                    self.store.update(tid,status=TaskStatus.waiting_approval.value); self.store.event(tid,'approval_required',step.label or step.action,{'step':i}); return
                if step.action=='wait.human':
                    self.store.update(tid,status=TaskStatus.waiting_human.value); self.store.event(tid,'human_required',step.label or 'Human handoff',{'step':i,'instructions':step.args}); return
                self.store.event(tid,'step_start',step.label or step.action,{'step':i,'action':step.action})
                result=None
                for attempt in range(step.retries+1):
                    try:
                        result=await self.execute_step(browser,step,tid,i); break
                    except Exception as exc:
                        if attempt>=step.retries: raise
                        self.store.event(tid,'step_retry',str(exc)[:1000],{'step':i,'attempt':attempt+1,'max_retries':step.retries})
                        if step.action.startswith('browser.'):
                            await browser.close(); browser=BrowserSession(self.artifacts)
                        await asyncio.sleep(min(2**attempt,8))
                if self.store.get(tid)['status']!=TaskStatus.running.value:return
                self.store.event(tid,'step_done',step.label or step.action,{'step':i,'result':result})
                self.store.update(tid,current_step=i+1,approved_step=-1)
        except Exception as e:
            if self.store.get(tid) and self.store.get(tid)['status']==TaskStatus.running.value:
                self.store.update(tid,status=TaskStatus.failed.value,last_error=str(e)[:4000]); self.store.event(tid,'failed',str(e)[:1000])
        finally: await browser.close()
