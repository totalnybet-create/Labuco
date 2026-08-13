from __future__ import annotations
import json, os
from mcp.server.fastmcp import FastMCP
from .labuco import PLAN_DETAILS, create_plan, overview
from .models import Approval, HumanResume, TaskCreate, TaskStatus
from .store import Store

DB=os.getenv('OPERATOR_DB','data/operator.db')
store=Store(DB)
mcp=FastMCP('Operator', json_response=True, stateless_http=True)

@mcp.tool()
def operator_create_task(name:str, steps_json:str, metadata_json:str='{}')->dict:
    """Create a resumable Operator task. steps_json is a JSON array of step objects."""
    data=TaskCreate(name=name,steps=json.loads(steps_json),metadata=json.loads(metadata_json or '{}'))
    return store.create(data)

@mcp.tool()
def labuco_start_plan(plan:str)->dict:
    """Start a trusted Labuco plan: quick-check, catalog-1000, or catalog-full."""
    if plan not in PLAN_DETAILS:return {'error':'unknown_plan','available':list(PLAN_DETAILS)}
    return store.create(create_plan(plan))

@mcp.tool()
def labuco_project_status()->dict:
    """Return Labuco repository, catalog and GitHub connection readiness."""
    return overview()

@mcp.tool()
def operator_list_tasks()->list[dict]:
    """List Operator tasks with status and progress percentage."""
    return store.list()

@mcp.tool()
def operator_task_status(task_id:str)->dict:
    """Get task status, checkpoint and recent event log."""
    task=store.get(task_id)
    if not task:return {'error':'task_not_found'}
    task['events']=store.events(task_id,100)
    return task

@mcp.tool()
def operator_pause(task_id:str)->dict:
    """Pause a running or queued Operator task."""
    return store.update(task_id,status=TaskStatus.paused.value) or {'error':'task_not_found'}

@mcp.tool()
def operator_resume(task_id:str)->dict:
    """Resume a paused or failed task from its last checkpoint."""
    task=store.get(task_id)
    if not task:return {'error':'task_not_found'}
    if task['status'] not in {TaskStatus.paused.value,TaskStatus.failed.value}:return {'error':'task_not_resumable','status':task['status']}
    return store.update(task_id,status=TaskStatus.queued.value,last_error='')

@mcp.tool()
def operator_cancel(task_id:str)->dict:
    """Cancel an Operator task without deleting its checkpoint history."""
    return store.update(task_id,status=TaskStatus.cancelled.value) or {'error':'task_not_found'}

@mcp.tool()
def operator_approve(task_id:str, approved:bool, note:str='')->dict:
    """Resolve an approval gate for a risky step."""
    task=store.get(task_id)
    if not task or task['status']!=TaskStatus.waiting_approval.value:return {'error':'no_approval_pending'}
    if not approved:return store.update(task_id,status=TaskStatus.cancelled.value,last_error='Approval rejected: '+note)
    store.event(task_id,'approved',note or 'Approved',{'step':task['current_step']})
    return store.update(task_id,approved_step=task['current_step'],status=TaskStatus.queued.value)

@mcp.tool()
def operator_human_resume(task_id:str, note:str='')->dict:
    """Continue after a human completes 2FA/CAPTCHA/login/consent handoff."""
    task=store.get(task_id)
    if not task or task['status']!=TaskStatus.waiting_human.value:return {'error':'no_human_handoff_pending'}
    store.event(task_id,'human_done',note or 'Human step completed')
    return store.update(task_id,current_step=task['current_step']+1,status=TaskStatus.queued.value,human_note=note)

if __name__=='__main__':
    mcp.settings.host=os.getenv('MCP_HOST','0.0.0.0')
    mcp.settings.port=int(os.getenv('MCP_PORT','8001'))
    mcp.run(transport='streamable-http')
