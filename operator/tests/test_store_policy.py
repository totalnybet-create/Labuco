import time
from app.models import Risk, Step, TaskCreate, TaskStatus
from app.policy import effective_risk
from app.store import Store

def test_checkpoint_resume(tmp_path):
    s=Store(str(tmp_path/'x.db')); t=s.create(TaskCreate(name='x',steps=[Step(action='browser.goto',args={'url':'https://example.com'}),Step(action='browser.screenshot')]))
    assert t['progress_pct']==0
    s.update(t['id'],current_step=1)
    assert s.get(t['id'])['progress_pct']==50

def test_policy_denies_destructive_root_rm():
    step=Step(action='shell.exec',args={'command':'rm -rf /'})
    assert effective_risk(step)==Risk.deny

def test_github_cancel_requires_confirmation():
    step=Step(action='github.cancel_workflow',args={'owner':'o','repo':'r','run_id':1})
    assert effective_risk(step)==Risk.confirm

def test_mutating_http_requires_confirmation():
    assert effective_risk(Step(action='http.request',args={'method':'POST','url':'https://example.com'}))==Risk.confirm
    assert effective_risk(Step(action='http.request',args={'method':'GET','url':'https://example.com'}))==Risk.safe

def test_watchdog_marks_stale_task_failed(tmp_path):
    s=Store(str(tmp_path/'x.db')); t=s.create(TaskCreate(name='x',steps=[Step(action='browser.screenshot')]))
    s.update(t['id'],status=TaskStatus.running.value,updated_at=time.time()-1000)
    # update() refreshes updated_at, so force stale timestamp directly for watchdog test.
    with s._db() as db: db.execute('UPDATE tasks SET updated_at=? WHERE id=?',(time.time()-1000,t['id']))
    assert t['id'] in s.mark_stale_running(120)
    assert s.get(t['id'])['status']==TaskStatus.failed.value
