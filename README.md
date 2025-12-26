# Mitt Psyke (Django API + Eleventy)

Backend (Django) provides data, auth, admin, and APIs. Frontend (Eleventy) builds static pages from the API at build time.

Repo layout

- `backend/` Django project and API
- `frontend/` Eleventy site
- `_reference/` original projects kept for reference

Requirements

- Python 3.13+ (Django 6)
- Node 18+ (Eleventy data loaders use `fetch`)

Backend setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install django pillow

python backend/manage.py migrate
python backend/manage.py import_support_lines --replace
python backend/manage.py import_support_line_categories --replace
python backend/manage.py import_hotlines --replace
python backend/manage.py import_quotes --replace

python backend/manage.py runserver
```

Frontend setup

```bash
cd frontend
npm install

# Build with API data
MITTPSYKE_API_BASE_URL=http://127.0.0.1:8000 npm run build

# Dev server (make sure Django is running)
MITTPSYKE_API_BASE_URL=http://127.0.0.1:8000 npm start
```

CI builds

- Set `MITTPSYKE_API_BASE_URL` in your build environment so Eleventy can fetch API data.

API endpoints (development)

- `http://127.0.0.1:8000/healthz/`
- `http://127.0.0.1:8000/api/v1/support-lines/`
- `http://127.0.0.1:8000/api/v1/support-line-categories/`
- `http://127.0.0.1:8000/api/v1/hotlines/`
- `http://127.0.0.1:8000/api/v1/quotes/`

Authentication (development)

- `http://127.0.0.1:8000/accounts/register/`
- `http://127.0.0.1:8000/accounts/login/`
- `http://127.0.0.1:8000/accounts/profile/`
- `http://127.0.0.1:8000/accounts/password-reset/`
