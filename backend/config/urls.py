"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from django.urls import include, path

from config.frontend_views import serve_frontend, serve_frontend_asset


def health_check(_request):
    return JsonResponse({'status': 'ok'})


urlpatterns = [
    path('healthz/', health_check),
    path('assets/<path:path>', serve_frontend_asset),
    path('', serve_frontend, {'path': 'index.html'}),
    path('accounts/login/', serve_frontend, {'path': 'accounts/login/index.html'}),
    path('accounts/register/', serve_frontend, {'path': 'accounts/register/index.html'}),
    path('accounts/profile/', login_required(serve_frontend), {'path': 'accounts/profile/index.html'}),
    path('accounts/profile/edit/', login_required(serve_frontend), {'path': 'accounts/profile/edit/index.html'}),
    path('dagbok/', login_required(serve_frontend), {'path': 'dagbok/index.html'}),
    path('kontakter/', login_required(serve_frontend), {'path': 'kontakter/index.html'}),
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('dagbok/', include('journal.urls')),
    path('kontakter/', include('contacts.urls')),
    path('api/', include('api.urls')),
    path('<path:path>/', serve_frontend),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
