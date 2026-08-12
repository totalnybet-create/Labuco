from __future__ import annotations
import asyncio, threading
from .executors import BrowserSession, github_cancel, shell_exec
from .models import Risk, Step, TaskStatus
from .policy import effective_risk
from .store import Store

class Worker:
    def __init__(self,store:Store,artifacts='data/artifacts'):
        self.store=store; self.artifacts=artifacts; self.stop_evt=threading.Event(); self.thread=None
    def start(self):
        if self.thread and self.thread.is_alive():return
        self.thread=threading.Thread(target=self._thread,daemon=True,name='operator-worker'); self.thread.start()
    def stop(self): self.stop_evt.set()
    def _thread(self): asyncio.run(self.loop())
    async def loop(self):
        while not self.stop_evt.is_set():
            task=self.store.next_queued()
            if not task: await asyncio.sleep(.5); continue
            await self.execute(task['id'])
    async def execute(self,tid):
        task=self.store.get(tid); browser=BrowserSession(self.artifacts)
        self.store.update(tid,status=TaskStatus.running.value); self.store.event(tid,'start','Task started')
        try:
            while True:
                task=self.store.get(tid)
                if task['status'] in {TaskStatus.cancelled.value,TaskStatus.paused.value}: return
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
                if step.action.startswith('browser.'):
                    result=await browser.run(step.action,step.args,tid,i,step.timeout_s)
                elif step.action=='shell.exec': result=await shell_exec(step.args,step.timeout_s)
                elif step.action=='github.cancel_workflow': result=await github_cancel(step.args,step.timeout_s)
                else: raise ValueError(step.action)
                self.store.event(tid,'step_done',step.label or step.action,{'step':i,'result':result})
                self.store.update(tid,current_step=i+1,approved_step=-1)
        except Exception as e:
            self.store.update(tid,status=TaskStatus.failed.value,last_error=str(e)[:4000]); self.store.event(tid,'failed',str(e)[:1000])
        finally: await browser.close()
