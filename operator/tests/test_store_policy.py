from app.models import Risk, Step, TaskCreate
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
