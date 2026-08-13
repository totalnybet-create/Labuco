# Labuco Pilot

Lokalny pomocnik dopasowany do projektu Labuco: katalog, testy storefrontu,
GitHub Actions, trwałe checkpointy, automatyczne wznowienie i panel na telefonie.

## Gotowe plany

- **Sprawdź cały projekt** — importery, testy katalogu, TypeScript, storefront i lokalizacje.
- **Testuj 1000 produktów** — kontrolowany dry-run bez zapisu do sklepu.
- **Synchronizuj 3316 ofert** — uruchamia pełny workflow GrowTent, monitoruje go do końca i pokazuje wynik.

## Zasady
- Każdy krok jest zapisywany w SQLite; wznowienie zaczyna od następnego niewykonanego kroku.
- Akcje ryzykowne wymagają zatwierdzenia. Destrukcyjne polecenia są blokowane.
- CAPTCHA, 2FA, płatności i zgody użytkownika są obsługiwane przez `wait.human`, bez obchodzenia zabezpieczeń.
- `BROWSER_CDP_URL` pozwala podłączyć Chromium/Chrome z istniejącą sesją. Bez niego Operator używa trwałego profilu Playwright.
- GitHub Actions można zatrzymywać przez akcję `github.cancel_workflow`; wymagany jest token z uprawnieniem Actions: write.

## Start
1. Z katalogu głównego uruchom `npm run helper`.
2. Panel: `http://localhost:8080`.
3. MCP Streamable HTTP: `http://localhost:8001/mcp` — port jest domyślnie związany wyłącznie z `127.0.0.1`.

Tryby lokalne działają bez konfiguracji. Pełna synchronizacja przez GitHub
wymaga `GITHUB_OPERATOR_TOKEN` z uprawnieniem Actions: write. Jeśli panel ma być
dostępny z telefonu w tej samej sieci, ustaw `OPERATOR_BIND=0.0.0.0` oraz długi
`OPERATOR_API_TOKEN` w `operator/.env`.

Kod repozytorium jest montowany do kontenera, więc Pilot zawsze pracuje na tej
samej wersji Labuco, którą widzisz lokalnie. Node 22, pnpm i przeglądarka są już
wbudowane w obraz pomocnika.

## Narzędzia MCP
`operator_create_task`, `operator_list_tasks`, `operator_task_status`, `operator_pause`, `operator_resume`, `operator_cancel`, `operator_approve`, `operator_human_resume`.

## Obsługiwane akcje wykonawcze
`browser.goto`, `browser.click`, `browser.fill`, `browser.press`, `browser.screenshot`, `browser.download`, `shell.exec`, `github.cancel_workflow`, `wait.human`.

## Następne moduły
Watchdog aktywności, Browser Use fallback, Supabase persistence, live browser view/noVNC, connector registry i audyt sekretów.
