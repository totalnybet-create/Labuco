from __future__ import annotations
import json, sqlite3, threading, time, uuid
from pathlib import Path
from typing import Any
from .models import TaskCreate, TaskStatus

class Store:
    def __init__(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.path=path; self._lock=threading.RLock(); self._init()
    def _db(self):
        c=sqlite3.connect(self.path, check_same_thread=False); c.row_factory=sqlite3.Row; return c
    def _init(self):
        with self._db() as db:
            db.executescript('''
            CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY,name TEXT,status TEXT,steps_json TEXT,metadata_json TEXT,current_step INTEGER DEFAULT 0,approved_step INTEGER DEFAULT -1,created_at REAL,updated_at REAL,last_error TEXT DEFAULT '',human_note TEXT DEFAULT '');
            CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT,task_id TEXT,ts REAL,kind TEXT,message TEXT,data_json TEXT);
            ''')
    def create(self, data:TaskCreate)->dict[str,Any]:
        now=time.time(); tid=str(uuid.uuid4())
        with self._db() as db: db.execute('INSERT INTO tasks VALUES(?,?,?,?,?,?,?,?,?,?,?)',(tid,data.name,TaskStatus.queued.value,json.dumps([x.model_dump(mode='json') for x in data.steps]),json.dumps(data.metadata),0,-1,now,now,'',''))
        self.event(tid,'created',data.name); return self.get(tid)
    def row(self,r):
        if not r:return None
        d=dict(r); d['steps']=json.loads(d.pop('steps_json')); d['metadata']=json.loads(d.pop('metadata_json')); d['total_steps']=len(d['steps']); d['progress_pct']=round(100*d['current_step']/max(1,d['total_steps']),1); return d
    def get(self,tid):
        with self._db() as db:return self.row(db.execute('SELECT * FROM tasks WHERE id=?',(tid,)).fetchone())
    def list(self):
        with self._db() as db:return [self.row(x) for x in db.execute('SELECT * FROM tasks ORDER BY created_at DESC').fetchall()]
    def next_queued(self):
        with self._db() as db:return self.row(db.execute("SELECT * FROM tasks WHERE status='queued' ORDER BY created_at LIMIT 1").fetchone())
    def update(self,tid,**kw):
        if not kw:return self.get(tid)
        kw['updated_at']=time.time(); keys=list(kw); vals=[kw[k] for k in keys]+[tid]
        with self._db() as db: db.execute('UPDATE tasks SET '+','.join(f'{k}=?' for k in keys)+' WHERE id=?',vals)
        return self.get(tid)
    def event(self,tid,kind,msg,data=None):
        with self._db() as db: db.execute('INSERT INTO events(task_id,ts,kind,message,data_json) VALUES(?,?,?,?,?)',(tid,time.time(),kind,msg,json.dumps(data or {})))
    def events(self,tid,limit=200):
        with self._db() as db:
            rows=db.execute('SELECT * FROM events WHERE task_id=? ORDER BY id DESC LIMIT ?',(tid,limit)).fetchall()
            return [{**dict(r),'data':json.loads(r['data_json'])} for r in rows]
    def mark_stale_running(self,stale_seconds:int)->list[str]:
        cutoff=time.time()-stale_seconds
        with self._db() as db:
            ids=[r['id'] for r in db.execute("SELECT id FROM tasks WHERE status='running' AND updated_at<?",(cutoff,)).fetchall()]
        for tid in ids:
            self.update(tid,status=TaskStatus.failed.value,last_error=f'Watchdog: no checkpoint for {stale_seconds}s')
            self.event(tid,'watchdog','Task marked failed because no checkpoint was recorded in time')
        return ids
