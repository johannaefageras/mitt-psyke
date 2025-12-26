# Mitt Psyke

Mitt Psyke is a Swedish mental health support platform. This repo contains a Django
backend that exposes JSON APIs (support data, auth, journal, contacts) and serves
the built Eleventy site, plus an Eleventy frontend that builds static pages from
the API and uses client-side JS with session auth (CSRF + cookies).

## Repo layout

- `backend/` Django project (config, API, accounts, journal, contacts)
- `frontend/` Eleventy site (templates, assets, build output in `site/`)
- `_reference/` original reference projects (do not modify)
- `src/` vendor/source extras
- `icon-names.txt` icon name list for the MP Icons font

## Requirements

- Python 3.13+ (Django 6)
- Node 18+ (Eleventy data loaders use `fetch`)

## Local development

### Backend

```bash
python -m venv .venv
source .venv/bin/activate

# Core deps (no pinned requirements file in repo)
pip install django pillow django-unfold

# Django settings enable several Unfold contrib apps.
# Install extra deps if they are missing at runtime:
# django-import-export, django-guardian, django-simple-history,
# django-location-field, django-constance

python backend/manage.py migrate

# Import initial data (order matters)
python backend/manage.py import_support_line_categories --replace
python backend/manage.py import_support_lines --replace
python backend/manage.py import_hotlines --replace
python backend/manage.py import_quotes --replace

python backend/manage.py runserver
```

### Frontend

```bash
cd frontend
npm install

# Dev server (requires Django running)
MITTPSYKE_API_BASE_URL=http://127.0.0.1:8000 npm start

# Production build
MITTPSYKE_API_BASE_URL=http://127.0.0.1:8000 npm run build
```

### Serve the full stack

1. Build Eleventy output into `frontend/site/`.
2. Run Django; `config/frontend_views.py` serves the built HTML and assets.

## Data flow

`frontend/src/_data/*Data.json` -> import commands -> DB -> API -> Eleventy build

## Environment variables

- `MITTPSYKE_API_BASE_URL` sets the API target for Eleventy data loaders.
- `MITTPSYKE_BACKEND_BASE_URL` can be used by the Eleventy dev proxy.

## API quick reference (development)

Health

- `http://127.0.0.1:8000/healthz/`

Auth and profile

- `http://127.0.0.1:8000/api/v1/csrf/`
- `http://127.0.0.1:8000/api/v1/auth/login/`
- `http://127.0.0.1:8000/api/v1/auth/logout/`
- `http://127.0.0.1:8000/api/v1/auth/register/`
- `http://127.0.0.1:8000/api/v1/auth/resend-verification/`
- `http://127.0.0.1:8000/api/v1/me/`
- `http://127.0.0.1:8000/api/v1/me/update/`

Support data

- `http://127.0.0.1:8000/api/v1/support-lines/`
- `http://127.0.0.1:8000/api/v1/support-line-categories/`
- `http://127.0.0.1:8000/api/v1/hotlines/`
- `http://127.0.0.1:8000/api/v1/quotes/`

Journal

- `http://127.0.0.1:8000/api/v1/journal/entries/`
- `http://127.0.0.1:8000/api/v1/journal/entries/<id>/`
- `http://127.0.0.1:8000/api/v1/journal/tags/`
- `http://127.0.0.1:8000/api/v1/journal/tags/<id>/`

Contacts

- `http://127.0.0.1:8000/api/v1/contacts/`
- `http://127.0.0.1:8000/api/v1/contacts/<id>/`
- `http://127.0.0.1:8000/api/v1/contacts/categories/`
- `http://127.0.0.1:8000/api/v1/contacts/categories/<id>/`
- `http://127.0.0.1:8000/api/v1/contacts/types/`
