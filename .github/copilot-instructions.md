# Mitt Psyke - Copilot Instructions

## Project Overview

Mitt Psyke är en svensk plattform för psykisk hälsa med Django-backend och Eleventy-frontend. Backend exponerar JSON-API:er (stöddata, auth, journal, kontakter) och servar byggda Eleventy-sidor. Frontend bygger statiska sidor från API:t vid build-time och använder client-side JS med session auth (CSRF + cookies).

## Tech Stack

- **Backend:** Django 6, Python 3.13+, SQLite (lokalt)
- **Frontend:** Eleventy 3.0, Nunjucks, Node 18+
- **Språk:** Svenska (locale: sv, timezone: Europe/Stockholm)

## Repository Structure

- `backend/` - Django projekt (api, accounts, journal, contacts)
- `frontend/` - Eleventy site (templates, assets, build output i `site/`)
- `_reference/` - Gamla projekt (modifiera EJ)
- `src/` - Extra källfiler
- `icon-names.txt` - Ikonnamn för MP Icons-fonten

## Code Style

### Python/Django

- Följ befintlig kodstil i `backend/`
- PEP 8, 4-space indentation, f-strings
- JSON responses via vanliga Django views (ingen DRF)
- Returnera svenska felmeddelanden för user-facing errors
- JSONField används för flexibla datastrukturer där det redan finns

### JavaScript/Frontend

- 2-space indentation (JS, HTML, CSS)
- Modern ES6+ syntax, async/await
- Nunjucks templates i `frontend/src/`
- BEM-konvention för CSS-klasser
- Mobile-first approach för CSS
- Använd partials för återanvändbar kod
- Macros för komplexa komponenter

## Project Architecture

### Django Apps

**`api/`** - Core API med stöddata

- Models: `SupportLine`, `SupportLineCategory`, `Hotline`, `Quote`
- Alla models använder JSONField för `resource`, `contact_types`, `tags`, `availability`
- Management commands importerar från frontend JSON-filer

**`accounts/`** - Användarhantering

- Utökar Django User med `Profile` (OneToOne)
- Profile inkluderar: `avatar`, `municipality`, `email_verified`
- Email-verifiering via UUID tokens (24h expiry)
- Signals skapar automatiskt Profile vid User.save()

**`journal/`** - Personal journal/mood tracking

- `JournalEntry`: mood scale 1-11, sleep, energy, anxiety (alla fält valfria)
- `JournalTag`: User-skapade tags med auto-cleanup via signals

**`contacts/`** - Kontakter och kategorier

- `Contact` och `ContactCategory` är user-scope:ade
- Cleanup av oanvända kategorier via signals
- Fördefinierade kontakttyper via API

**`config/`** - Settings, routing, middleware

- Unfold admin theme (MÅSTE vara före `django.contrib.admin` i `INSTALLED_APPS`)
- Custom CORS middleware: `config.middleware.CorsMiddleware`
- Frontend views servar Eleventy-byggda filer från `frontend/site/`
- CSRF trusted origins: `http://localhost:8080` (Eleventy dev server)

### Key Data Flow Pattern

**JSON → Django → API → Frontend:**

1. Raw data i `frontend/src/_data/*Data.json`
2. Management commands importerar till Django models
3. API endpoints exponerar data
4. JavaScript adapters (ex. `supportlines.js`) fetchar från API vid build
5. Eleventy bygger statiska sidor med data

**Management Commands:**

```bash
python backend/manage.py import_support_line_categories --replace
python backend/manage.py import_support_lines --replace
python backend/manage.py import_hotlines --replace
python backend/manage.py import_quotes --replace
```

- `--replace` flag raderar existerande data före import
- VIKTIGT: Kör categories först (stödlinjer refererar kategorier)

**Signal Usage:**

- `@receiver(post_save, sender=User)`: Auto-skapar Profile
- `@receiver(post_delete, sender=JournalEntry)`: Cleanup orphaned tags
- `@receiver(m2m_changed, sender=JournalEntry.tags.through)`: Tag cleanup vid ändringar

### Frontend Architecture

**Eleventy Collections (`.eleventy.js`):**

- `portaler` - Tematiska sidor (sorterade på `order` field)
- `viktigaSidor` - Policy/juridiska sidor

**Portal System:**
Markdown-filer i `frontend/src/portaler/` med front matter:

```yaml
title: 'Portal Title'
subtitle: 'Kort beskrivning'
description: 'Längre text'
icon: 'icon icon-name'
relatedTags: ['angest', 'samtal'] # Matchar mot stödlinjer
order: 1
```

**Key Filters (`.eleventy.js`):**

- `relevantSupportlines(supportlines, portalTags, limit=9)` - Sofistikerat poängsystem som rankar stödlinjer baserat på portal-tags. Undviker generiska matcher genom att ge lägre vikt till breda tags som "psykiskohalsa"
- `normalizePortalTag(tag)` - Normaliserar tag-varianter (ex. "ptsd" → "trauma", "oro" → "angest")
- `openStatus(openingHours)` / `statusLabel(openingHours)` - Build-time tillgänglighetsstatus
- `supportlinesPhoneFirst(lines)` - Sorterar linjer med telefonnummer först
- `shuffle(array)` - Randomiserar stödlinje-ordning
- `truncateWords(text, maxWords=15)` - Text-excerpts för cards

**Dev Server Proxy:**
Eleventy dev server (port 8080) proxar requests till Django (port 8000):

- Proxade paths: `/accounts/`, `/api/`, `/admin/`, `/static/`, `/media/`
- Konfigureras via `MITTPSYKE_BACKEND_BASE_URL` eller `MITTPSYKE_API_BASE_URL`
- Custom middleware i `.eleventy.js` hanterar proxy-logik

**Data Adapters Pattern:**

- `*Data.json` (raw data) → JavaScript transformer → Templates
- Exempel: `supportlines.js` fetchar från `/api/v1/support-lines/` vid build
- Kräver Node 18+ för native `fetch()` support
- Data Files i `frontend/src/_data/`:
  - `supportData.json` - Stödlinjer
  - `supportLineCatsData.json` - Kategorier
  - `hotlinesData.json` - Nödlinjer
  - `quotesData.json` - Citat

## Development Workflow

### Backend Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install django pillow django-unfold

# Installera extra deps om Unfold kräver dem i runtime:
# django-import-export, django-guardian, django-simple-history,
# django-location-field, django-constance

python backend/manage.py migrate
python backend/manage.py import_support_line_categories --replace
python backend/manage.py import_support_lines --replace
python backend/manage.py import_hotlines --replace
python backend/manage.py import_quotes --replace

python backend/manage.py runserver  # Port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Dev server (kräver Django running)
MITTPSYKE_API_BASE_URL=http://127.0.0.1:8000 npm start  # Port 8080

# Production build
MITTPSYKE_API_BASE_URL=http://127.0.0.1:8000 npm run build

# Debug mode
DEBUG=Eleventy* eleventy
```

### Typisk Development Flow

**För data-ändringar:**

1. Uppdatera JSON i `frontend/src/_data/`
2. Kör motsvarande `import_*` management command med `--replace`
3. Restart Django vid behov
4. Rebuild frontend om du bygger från API

**För frontend-ändringar:**

- Eleventy dev server har hot reload
- Editera filer i `frontend/src/`, sparar automatiskt

**För ny portal:**

1. Skapa markdown i `frontend/src/portaler/` med korrekt front matter
2. `relevantSupportlines` filter matchar automatiskt stödlinjer baserat på `relatedTags`

## API Endpoints (Development)

**Health:**

- `http://127.0.0.1:8000/healthz/`

**Auth & profile:**

- `http://127.0.0.1:8000/api/v1/csrf/`
- `http://127.0.0.1:8000/api/v1/auth/login/`
- `http://127.0.0.1:8000/api/v1/auth/logout/`
- `http://127.0.0.1:8000/api/v1/auth/register/`
- `http://127.0.0.1:8000/api/v1/auth/resend-verification/`
- `http://127.0.0.1:8000/api/v1/me/`
- `http://127.0.0.1:8000/api/v1/me/update/`

**Support data:**

- `http://127.0.0.1:8000/api/v1/support-lines/`
- `http://127.0.0.1:8000/api/v1/support-line-categories/`
- `http://127.0.0.1:8000/api/v1/hotlines/`
- `http://127.0.0.1:8000/api/v1/quotes/`

**Journal:**

- `http://127.0.0.1:8000/api/v1/journal/entries/`
- `http://127.0.0.1:8000/api/v1/journal/entries/<id>/`
- `http://127.0.0.1:8000/api/v1/journal/tags/`
- `http://127.0.0.1:8000/api/v1/journal/tags/<id>/`

**Contacts:**

- `http://127.0.0.1:8000/api/v1/contacts/`
- `http://127.0.0.1:8000/api/v1/contacts/<id>/`
- `http://127.0.0.1:8000/api/v1/contacts/categories/`
- `http://127.0.0.1:8000/api/v1/contacts/categories/<id>/`
- `http://127.0.0.1:8000/api/v1/contacts/types/`

## Important Conventions

1. **Språk:** All user-facing text på svenska
2. **Svenska datum:** Använd `svenskDatum` filter i templates när datum renderas
3. **CORS:** Custom middleware i `config/middleware.py` hanterar CORS för frontend dev server
4. **Mood scale:** 1-11 (INTE 1-10) - visas som SVG-ikoner i UI
5. **Journal fields:** Alla fält valfria för flexibel journaling
6. **Static files:** Django servar Eleventy output från `frontend/site/`. Bygg frontend före test av integrerade views
7. **Database:** SQLite på `backend/db.sqlite3`. JSONFields tillåter schema evolution utan migrations
8. **Admin theme:** Unfold MÅSTE vara före `django.contrib.admin` i `INSTALLED_APPS`
9. **Security:** CSRF protection aktiverad, email verification med UUID tokens (24h expiry), trusted origins för localhost:8080
