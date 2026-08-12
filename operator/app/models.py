from __future__ import annotations
from enum import Enum
from typing import Any, Literal
from pydantic import BaseModel, Field

class TaskStatus(str, Enum):
    queued='queued'; running='running'; paused='paused'; waiting_human='waiting_human'; waiting_approval='waiting_approval'; completed='completed'; failed='failed'; cancelled='cancelled'

class Risk(str, Enum):
    safe='safe'; confirm='confirm'; deny='deny'

ActionType = Literal['browser.goto','browser.click','browser.fill','browser.press','browser.screenshot','browser.download','http.request','shell.exec','github.cancel_workflow','wait.human']

class Step(BaseModel):
    action: ActionType
    args: dict[str, Any] = Field(default_factory=dict)
    label: str = ''
    risk: Risk = Risk.safe
    timeout_s: int = Field(default=60, ge=1, le=900)
    retries: int = Field(default=2, ge=0, le=5)

class TaskCreate(BaseModel):
    name: str
    steps: list[Step]
    metadata: dict[str, Any] = Field(default_factory=dict)

class Approval(BaseModel):
    approved: bool
    note: str = ''

class HumanResume(BaseModel):
    note: str = ''
