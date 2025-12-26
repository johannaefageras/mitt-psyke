from django.conf import settings
from django.http import HttpResponse


class CorsMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.allowed_origins = set(getattr(settings, 'CORS_ALLOWED_ORIGINS', []))

    def __call__(self, request):
        origin = request.headers.get('Origin')
        if origin and origin in self.allowed_origins and request.method == 'OPTIONS':
            response = HttpResponse(status=204)
            self._apply_headers(response, origin)
            return response

        response = self.get_response(request)
        if origin and origin in self.allowed_origins:
            self._apply_headers(response, origin)
        return response

    def _apply_headers(self, response, origin):
        response['Access-Control-Allow-Origin'] = origin
        response['Access-Control-Allow-Credentials'] = 'true'
        response['Access-Control-Allow-Headers'] = 'Content-Type, X-CSRFToken'
        response['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
        response['Vary'] = 'Origin'
