# Labuco

Labuco to kompletna, nowoczesna baza platformy ogłoszeniowo-handlowej oparta
na [Spree Commerce](https://spreecommerce.org), Ruby on Rails oraz Next.js 16 / React 19.
Projekt jest przygotowany do dalszego rozwoju dużego, czytelnego katalogu —
od pierwszych ofert po tysiące produktów lub ogłoszeń.

## Co jest już gotowe

- responsywny storefront z wyszukiwaniem, kategoriami, filtrami i sortowaniem,
- wydajne stronicowanie, sitemap podzielony na paczki po 10 000 adresów i SEO,
- konto użytkownika, koszyk, checkout, zamówienia i lista życzeń,
- rozbudowany panel administracyjny i API do zarządzania katalogiem,
- warianty, ceny, promocje, stany magazynowe, płatności i dostawy,
- obsługa wielu krajów, walut i języków, w tym języka polskiego,
- integracje Stripe, PayPal i Adyen oraz opcjonalne wyszukiwanie Meilisearch,
- przykładowe dane, testy automatyczne i konfiguracja Docker do lokalnego startu.

Backend jest udostępniony na licencji BSD-3-Clause, a storefront na MIT, więc
można legalnie rozwijać, przebudowywać i wykorzystywać projekt komercyjnie z
zachowaniem informacji licencyjnych znajdujących się w obu częściach systemu.

## Architektura

| Część | Technologia | Rola |
|---|---|---|
| `backend/` | Spree + Ruby on Rails + PostgreSQL | katalog, użytkownicy, zamówienia, panel i API |
| `apps/storefront/` | Next.js 16 + React 19 + TypeScript | szybki, responsywny interfejs dla klientów |
| `docker-compose.yml` | Docker Compose | lokalne uruchomienie usług i bazy danych |

## Labuco Pilot — lokalny pomocnik

Projekt zawiera panel automatyzacji dopasowany do Labuco. Potrafi samodzielnie
sprawdzić cały projekt, zweryfikować próbę 1000 produktów oraz uruchomić i
monitorować pełną synchronizację 3316 ofert. Każde zadanie zapisuje checkpointy,
więc po przerwaniu można je wznowić od ostatniego wykonanego kroku.

```bash
npm run helper
```

Panel uruchamia się pod adresem `http://localhost:8080`. Szczegóły konfiguracji
i połączenia MCP znajdują się w [`operator/README.md`](operator/README.md).

Model produktu stanowi gotowy punkt wyjścia dla ogłoszenia. Pola i procesy
specyficzne dla Labuco — np. sprzedawcy, lokalizacja, publikacja i moderacja —
można rozszerzać w Rails bez przepisywania katalogu, panelu i całego frontendu.

## Getting Started

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed and running

### Start the Spree API

```bash
cd Labuco
npx spree dev
```

The first run completes setup automatically — it pulls the latest Spree image,
seeds the database, and configures API keys.

Wait for the services to be healthy, then open:

- **Admin Dashboard:** http://localhost:3000/admin
  - Email: `spree@example.com`
  - Password: `spree123`
- **Store API:** http://localhost:3000/api/v3/store

### Start the storefront

Dependencies are already installed during setup — just start it:

```bash
cd apps/storefront
npm run dev
```

Open http://localhost:3001

## Customizing the Spree API

The `backend/` directory is the Spree API — a full Rails application serving the Store and Admin APIs (plus background jobs and transactional emails) that your storefront and dashboard talk to. By default, the project runs it from a prebuilt Docker image. To switch to building from your local copy:

```bash
npx spree eject
```

This rebuilds the Docker image from `backend/` and restarts services. You can then:

- **Customize the API** by editing the files in `backend/`
- **Add gems** to `backend/Gemfile`
- **Add new resources** with `spree generate model <name> <attributes>`

## Spree CLI

This project uses [`@spree/cli`](https://spreecommerce.org/docs/developer/cli/quickstart) to manage the Spree API.

### Services

| Command | Description |
|---------|-------------|
| `spree dev` | Run the app in the foreground — streams logs, Ctrl+C stops it. First run completes setup automatically |
| `spree stop` | Stop the API services |
| `spree update` | Pull latest Spree image and restart (runs migrations automatically) |
| `spree eject` | Switch from prebuilt image to building from `backend/` |
| `spree build --production` | Build the production image — includes `apps/dashboard` when present |
| `spree logs` | View web server logs |
| `spree logs worker` | View background jobs logs |
| `spree console` | Open Rails console |

### Data

| Command | Description |
|---------|-------------|
| `spree migrate` | Install pending Spree migrations from gems, then run them or just run your own migrations |
| `spree seed` | Seed the database |
| `spree sample-data` | Load sample products, categories, images |

### Users & API Keys

| Command | Description |
|---------|-------------|
| `spree user create` | Create an admin user |
| `spree api-key create` | Create a publishable or secret API key |
| `spree api-key list` | List all API keys |
| `spree api-key revoke <id>` | Revoke an API key (ID from `api-key list`) |

### Generators

| Command | Description |
|---------|-------------|
| `spree generate model Brand name:string slug:string:uniq` | Generate a new database model |
| `spree generate api_resource Brand name:string slug:string:uniq` | Generate a new Spree API resource |
| `spree generate subscriber OmsOrderSync order.completed` | Generate a new event subscriber |
| `spree generate migration AddPositionToSpreeBrands position:integer` | Generate a new database migration |

### Admin API

Project setup mints a read-only secret key into `.spree/credentials.json` (gitignored), so the Admin API client works out of the box. If you skipped the setup step, `spree api` mints the key on first use instead:

```bash
npx spree api get products
npx spree api get "orders?q[state_eq]=complete"
npx spree api endpoints          # list endpoints + required scopes
npx spree api status             # show resolved credentials + server reachability
```

The pre-configured key is read-only. To write, create a scoped secret key and pass it via `SPREE_API_KEY`:

```bash
npx spree api-key create --scopes write_products
SPREE_API_KEY=sk_... npx spree api post products --data '{"name":"New product","prices":[{"currency":"USD","amount":"29.99"}]}'
```

| Command | Description |
|---------|-------------|
| `spree api get/post/patch/delete <path>` | Call the Admin API directly |
| `spree api endpoints` | List Admin API endpoints with required scopes |
| `spree auth login --profile <name>` | Save named credentials for a remote store |

> **Running `spree` directly.** The commands above use `npx` because `@spree/cli` is a local project dependency. You can also run any of the package scripts (e.g. `npm run api -- get products`), or install the CLI globally for a bare `spree` command:
>
> ```bash
> npm install -g @spree/cli
> spree api get products
> ```

## Learn More

- [Spree Documentation](https://spreecommerce.org/docs)
- [Spree Discord](https://discord.spreecommerce.org)
- [Store API Reference](https://spreecommerce.org/docs/api-reference/store-api/introduction)
- [Admin API Reference](https://spreecommerce.org/docs/api-reference/admin-api/introduction)
- [CLI Reference](https://spreecommerce.org/docs/developer/cli/quickstart)
- [Spree GitHub](https://github.com/spree/spree)
