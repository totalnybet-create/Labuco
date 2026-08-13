from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .models import Risk, Step, TaskCreate


PLAN_DETAILS = {
    'quick-check': {
        'name': 'Szybki przegląd Labuco',
        'description': 'Sprawdza importery, testy katalogu i jakość storefrontu.',
    },
    'catalog-1000': {
        'name': 'Bezpieczny test 1000 produktów',
        'description': 'Waliduje 1000 ofert i wykonuje import próbny bez zapisu do sklepu.',
    },
    'catalog-full': {
        'name': 'Pełna synchronizacja 3316 produktów',
        'description': 'Uruchamia zdalne pobranie, walidację, zapis katalogu i import do Supabase.',
    },
}


def repo_path() -> Path:
    return Path(os.getenv('LABUCO_REPO', '/workspace/labuco')).resolve()


def _shell(command: str, label: str, timeout_s: int = 900) -> Step:
    return Step(
        action='shell.exec',
        args={'command': command, 'cwd': str(repo_path())},
        label=label,
        timeout_s=timeout_s,
        retries=0,
    )


def create_plan(plan: str) -> TaskCreate:
    if plan == 'quick-check':
        return TaskCreate(
            name=PLAN_DETAILS[plan]['name'],
            metadata={'plan': plan},
            steps=[
                _shell(
                    "python -m py_compile tools/labuco_*.py && "
                    "python -m unittest discover -s tests -p 'test_*.py' -v",
                    'Testy i walidacja importerów',
                ),
                _shell(
                    "export COREPACK_HOME=/tmp/labuco-corepack "
                    "XDG_DATA_HOME=/tmp/labuco-xdg-data "
                    "XDG_CACHE_HOME=/tmp/labuco-xdg-cache "
                    "PNPM_HOME=/tmp/labuco-pnpm CI=true; "
                    "mkdir -p \"$COREPACK_HOME\" \"$XDG_DATA_HOME\" \"$XDG_CACHE_HOME\" \"$PNPM_HOME\"; "
                    "corepack pnpm@10.33.4 --dir apps/storefront install --frozen-lockfile && "
                    "corepack pnpm@10.33.4 --dir apps/storefront run check && "
                    "corepack pnpm@10.33.4 --dir apps/storefront exec tsc --noEmit && "
                    "corepack pnpm@10.33.4 --dir apps/storefront exec node --import tsx scripts/check-locale-parity.ts && "
                    "corepack pnpm@10.33.4 --dir apps/storefront run test",
                    'Testy storefrontu',
                    2400,
                ),
                _shell('git diff --check', 'Kontrola spójności zmian'),
            ],
        )
    if plan == 'catalog-1000':
        return TaskCreate(
            name=PLAN_DETAILS[plan]['name'],
            metadata={'plan': plan},
            steps=[
                _shell(
                    "test -f data/labuco_catalog.json && "
                    "python tools/labuco_spree_import.py data/labuco_catalog.json "
                    "--limit 1000 --report tmp/labuco-helper-1000.json",
                    'Walidacja 1000 produktów bez zapisu',
                    1200,
                ),
                _shell(
                    "python -c \"import json; r=json.load(open('tmp/labuco-helper-1000.json')); "
                    "assert r['requested']==1000 and r['failed']==0; print(json.dumps({k:r[k] for k in "
                    "('requested','created','updated','skipped','failed')},ensure_ascii=False))\"",
                    'Kontrola raportu 1000 produktów',
                ),
            ],
        )
    if plan == 'catalog-full':
        workflow_args = {
            'owner': os.getenv('LABUCO_GITHUB_OWNER', 'totalnybet-create'),
            'repo': os.getenv('LABUCO_GITHUB_REPO', 'Labuco'),
            'workflow': 'growtent-catalog.yml',
        }
        return TaskCreate(
            name=PLAN_DETAILS[plan]['name'],
            metadata={'plan': plan, 'approved_steps': [0]},
            steps=[
                Step(
                    action='github.dispatch_workflow',
                    args={**workflow_args, 'ref': 'main', 'inputs': {'download_images': '0', 'max_products': '0'}},
                    label='Uruchomienie pełnej synchronizacji katalogu',
                    risk=Risk.confirm,
                    timeout_s=120,
                    retries=2,
                ),
                Step(
                    action='github.wait_workflow',
                    args={**workflow_args, 'branch': 'main', 'poll_s': 20, 'max_age_s': 900},
                    label='Pobieranie i import 3316 produktów',
                    timeout_s=21600,
                    retries=0,
                ),
            ],
        )
    raise KeyError(plan)


def overview(path: Path | None = None) -> dict[str, Any]:
    root = path or repo_path()
    catalog = root / 'data' / 'labuco_catalog.json'
    summary = root / 'data' / 'labuco_catalog.summary.json'
    count = 0
    catalog_error = ''
    if catalog.exists():
        try:
            payload = json.loads(catalog.read_text(encoding='utf-8'))
            count = len(payload) if isinstance(payload, list) else 0
        except Exception as exc:
            catalog_error = str(exc)
    return {
        'repo_ready': (root / 'apps' / 'storefront').is_dir() and (root / 'backend').is_dir(),
        'catalog_ready': count == 3316,
        'catalog_products': count,
        'catalog_error': catalog_error,
        'summary_ready': summary.exists(),
        'github_connected': bool((os.getenv('GITHUB_OPERATOR_TOKEN') or os.getenv('GITHUB_TOKEN') or '').strip()),
        'plans': PLAN_DETAILS,
    }
