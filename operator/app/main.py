from __future__ import annotations
import os, time
from pathlib import Path
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .labuco import PLAN_DETAILS, create_plan, overview
from .models import Approval, HumanResume, TaskCreate, TaskStatus
from .store import Store
from .worker import Worker

DB=os.getenv('OPERATOR_DB','data/operator.db'); TOKEN=os.getenv('OPERATOR_API_TOKEN','')
store=Store(DB); worker=Worker(store)
app=FastAPI(title='Operator',version='0.1.0')
static=Path(__file__).parent/'static'; app.mount('/static',StaticFiles(directory=static),name='static')

def auth(authorization:str|None=Header(default=None)):
    if TOKEN and authorization!=f'Bearer {TOKEN}': raise HTTPException(401,'Unauthorized')

@app.on_event('startup')
def startup(): worker.start()
@app.get('/',include_in_schema=False)
def dashboard(): return FileResponse(static/'index.html')
@app.get('/health')
def health(): return {'ok':True,'time':time.time()}
@app.get('/api/tasks',dependencies=[Depends(auth)])
def tasks(): return store.list()
@app.get('/api/labuco',dependencies=[Depends(auth)])
def labuco_status(): return overview()
@app.post('/api/labuco/plans/{plan}',dependencies=[Depends(auth)])
def labuco_start(plan:str):
    if plan not in PLAN_DETAILS: raise HTTPException(404,'Unknown Labuco plan')
    return store.create(create_plan(plan))
@app.post('/api/tasks',dependencies=[Depends(auth)])
def create(data:TaskCreate): return store.create(data)
@app.get('/api/tasks/{tid}',dependencies=[Depends(auth)])
def task(tid:str):
    x=store.get(tid)
    if not x: raise HTTPException(404,'Task not found')
    x['events']=store.events(tid); return x
@app.post('/api/tasks/{tid}/pause',dependencies=[Depends(auth)])
def pause(tid:str): return store.update(tid,status=TaskStatus.paused.value)
@app.post('/api/tasks/{tid}/resume',dependencies=[Depends(auth)])
def resume(tid:str):
    x=store.get(tid)
    if not x: raise HTTPException(404)
    if x['status'] not in {TaskStatus.paused.value,TaskStatus.failed.value}: raise HTTPException(409,'Task is not resumable')
    return store.update(tid,status=TaskStatus.queued.value,last_error='')
@app.post('/api/tasks/{tid}/cancel',dependencies=[Depends(auth)])
def cancel(tid:str): return store.update(tid,status=TaskStatus.cancelled.value)
@app.post('/api/tasks/{tid}/approve',dependencies=[Depends(auth)])
def approve(tid:str,data:Approval):
    x=store.get(tid)
    if not x or x['status']!=TaskStatus.waiting_approval.value: raise HTTPException(409,'No approval pending')
    if not data.approved: return store.update(tid,status=TaskStatus.cancelled.value,last_error='Approval rejected: '+data.note)
    store.event(tid,'approved',data.note or 'Approved',{'step':x['current_step']}); return store.update(tid,approved_step=x['current_step'],status=TaskStatus.queued.value)
@app.post('/api/tasks/{tid}/human-resume',dependencies=[Depends(auth)])
def human_resume(tid:str,data:HumanResume):
    x=store.get(tid)
    if not x or x['status']!=TaskStatus.waiting_human.value: raise HTTPException(409,'No human handoff pending')
    store.event(tid,'human_done',data.note or 'Human step completed'); return store.update(tid,current_step=x['current_step']+1,status=TaskStatus.queued.value,human_note=data.note)
