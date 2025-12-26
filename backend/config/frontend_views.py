import mimetypes
from pathlib import Path

from django.conf import settings
from django.http import FileResponse, Http404, HttpResponse
from django.utils._os import safe_join
from django.views.static import serve as static_serve


FRONTEND_BUILD_DIR = Path(getattr(settings, 'FRONTEND_BUILD_DIR', ''))


def _resolve_frontend_path(path):
    if not path or path.endswith('/'):
        path = f"{path}index.html"
    elif Path(path).suffix == '':
        path = f"{path}/index.html"

    try:
        full_path = Path(safe_join(str(FRONTEND_BUILD_DIR), path))
    except Exception as exc:
        raise Http404 from exc

    if not full_path.exists() or not full_path.is_file():
        raise Http404

    return full_path


def serve_frontend(request, path='index.html'):
    if not FRONTEND_BUILD_DIR:
        raise Http404

    full_path = _resolve_frontend_path(path)
    content_type, _encoding = mimetypes.guess_type(str(full_path))
    content_type = content_type or 'text/html'

    if content_type == 'text/html' and request.user.is_authenticated:
        try:
            body = full_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            return FileResponse(full_path.open('rb'), content_type=content_type)

        # Hide login button, show profile button when authenticated
        body = body.replace('data-auth-nav="login">', 'data-auth-nav="login" hidden>')
        body = body.replace('data-auth-nav="profile" hidden>', 'data-auth-nav="profile">')
        return HttpResponse(body, content_type=content_type)

    return FileResponse(full_path.open('rb'), content_type=content_type)


def serve_frontend_asset(request, path):
    if not FRONTEND_BUILD_DIR:
        raise Http404

    asset_root = FRONTEND_BUILD_DIR / 'assets'
    if not asset_root.exists():
        raise Http404

    return static_serve(request, path, document_root=str(asset_root))
