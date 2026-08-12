# Operator

Stały wykonawca automatyzacji: Playwright + shell + GitHub API + trwałe checkpointy + human handoff + MCP.

## Zasady
- Każdy krok jest zapisywany w SQLite; wznowienie zaczyna od następnego niewykonanego kroku.
- Akcje ryzykowne wymagają zatwierdzenia. Destrukcyjne polecenia są blokowane.
- CAPTCHA, 2FA, płatności i zgody użytkownika są obsługiwane przez `wait.human`, bez obchodzenia zabezpieczeń.
- `BROWSER_CDP_URL` pozwala podłączyć Chromium/Chrome z istniejącą sesją. Bez niego Operator używa trwałego profilu Playwright.
- GitHub Actions można zatrzymywać przez akcję `github.cancel_workflow`; wymagany jest token z uprawnieniem Actions: write.

## Start
1. Skopiuj `.env.example` do `.env` i ustaw sekrety.
2. `docker compose up --build -d`
3. Panel: `http://localhost:8080`.
4. MCP Streamable HTTP: `http://localhost:8001/mcp` — port jest domyślnie związany wyłącznie z `127.0.0.1`.

## Narzędzia MCP
`operator_create_task`, `operator_list_tasks`, `operator_task_status`, `operator_pause`, `operator_resume`, `operator_cancel`, `operator_approve`, `operator_human_resume`.

## Obsługiwane akcje wykonawcze
`browser.goto`, `browser.click`, `browser.fill`, `browser.press`, `browser.screenshot`, `browser.download`, `shell.exec`, `github.cancel_workflow`, `wait.human`.

## Następne moduły
Watchdog aktywności, Browser Use fallback, Supabase persistence, live browser view/noVNC, connector registry i audyt sekretów.
