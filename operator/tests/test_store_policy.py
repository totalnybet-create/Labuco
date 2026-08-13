import time
import json
from app.models import Risk, Step, TaskCreate, TaskStatus
from app.labuco import create_plan, overview
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

def test_github_dispatch_requires_confirmation():
    step=Step(action='github.dispatch_workflow',args={'owner':'o','repo':'r','workflow':'w.yml'})
    assert effective_risk(step)==Risk.confirm

def test_github_wait_is_safe():
    step=Step(action='github.wait_workflow',args={'owner':'o','repo':'r','workflow':'w.yml'})
    assert effective_risk(step)==Risk.safe

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

def test_touch_refreshes_running_task_without_changing_status(tmp_path):
    s=Store(str(tmp_path/'x.db')); t=s.create(TaskCreate(name='x',steps=[Step(action='browser.screenshot')]))
    s.update(t['id'],status=TaskStatus.running.value)
    before=s.get(t['id'])['updated_at']
    time.sleep(.01)
    touched=s.touch(t['id'])
    assert touched['status']==TaskStatus.running.value
    assert touched['updated_at']>before

def test_labuco_plans_are_valid_and_full_sync_is_preapproved(monkeypatch,tmp_path):
    monkeypatch.setenv('LABUCO_REPO',str(tmp_path))
    assert len(create_plan('quick-check').steps)==3
    assert len(create_plan('catalog-1000').steps)==2
    full=create_plan('catalog-full')
    assert [step.action for step in full.steps]==['github.dispatch_workflow','github.wait_workflow']
    assert full.metadata['approved_steps']==[0]

def test_labuco_overview_counts_valid_catalog(tmp_path):
    (tmp_path/'apps/storefront').mkdir(parents=True)
    (tmp_path/'backend').mkdir()
    (tmp_path/'data').mkdir()
    (tmp_path/'data/labuco_catalog.json').write_text(json.dumps([{'id':i} for i in range(3316)]),encoding='utf-8')
    state=overview(tmp_path)
    assert state['repo_ready'] is True
    assert state['catalog_ready'] is True
    assert state['catalog_products']==3316
