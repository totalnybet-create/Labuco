from __future__ import annotations
import asyncio, json, os, re
from pathlib import Path
from app.models import TaskCreate
from app.store import Store
from app.worker import Worker


def parse_body(raw:str)->dict:
    raw=(raw or '').strip()
    fenced=re.search(r'```(?:json)?\s*(\{.*\})\s*```',raw,re.S|re.I)
    if fenced: raw=fenced.group(1)
    data=json.loads(raw)
    if 'task' in data:
        task=data['task']
        if data.get('approved_steps') is not None:
            task.setdefault('metadata',{})['approved_steps']=data['approved_steps']
        return task
    return data

async def main():
    body=os.environ.get('ISSUE_BODY','')
    payload=parse_body(body)
    task_data=TaskCreate.model_validate(payload)
    store=Store(os.getenv('OPERATOR_DB','/tmp/operator-issue.db'))
    task=store.create(task_data)
    worker=Worker(store,artifacts=os.getenv('OPERATOR_ARTIFACTS','operator-artifacts'))
    await worker.execute(task['id'])
    result=store.get(task['id'])
    result['events']=store.events(task['id'],50)
    # Do not include the full step arguments in the issue comment/result file.
    result.pop('steps',None)
    Path(os.getenv('OPERATOR_RESULT','operator-result.json')).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'id':result['id'],'status':result['status'],'progress_pct':result['progress_pct'],'last_error':result['last_error']},ensure_ascii=False))

if __name__=='__main__': asyncio.run(main())
