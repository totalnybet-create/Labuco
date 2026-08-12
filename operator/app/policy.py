from __future__ import annotations
import re
from .models import Risk, Step

DENY_SHELL=[r'(^|\s)rm\s+-rf\s+/(\s|$)',r'mkfs\b',r':\(\)\s*\{\s*:\|:&\s*\};:',r'\bdd\s+if=',r'\bshutdown\b',r'\breboot\b']
CONFIRM_SHELL=[r'\bgit\s+push\b',r'\bterraform\s+apply\b',r'\bkubectl\s+(delete|apply)\b',r'\bdocker\s+system\s+prune\b']

def effective_risk(step:Step)->Risk:
    if step.risk==Risk.deny:return Risk.deny
    if step.action=='shell.exec':
        cmd=str(step.args.get('command',''))
        if any(re.search(p,cmd,re.I) for p in DENY_SHELL):return Risk.deny
        if any(re.search(p,cmd,re.I) for p in CONFIRM_SHELL):return Risk.confirm
    if step.action=='http.request':
        method=str(step.args.get('method','GET')).upper()
        if method not in {'GET','HEAD','OPTIONS'} and step.risk==Risk.safe:return Risk.confirm
    if step.action=='github.cancel_workflow': return Risk.confirm if step.risk==Risk.safe else step.risk
    return step.risk
