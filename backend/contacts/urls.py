from django.contrib.auth.decorators import login_required
from django.urls import path
from django.views.generic import RedirectView

app_name = 'contacts'

redirect_to_frontend = login_required(
    RedirectView.as_view(url='/kontakter/', permanent=False)
)

urlpatterns = [
    # Kontakter
    path('', redirect_to_frontend, name='contact_list'),
    path('ny/', redirect_to_frontend, name='contact_create'),
    path('<int:pk>/', redirect_to_frontend, name='contact_detail'),
    path('<int:pk>/redigera/', redirect_to_frontend, name='contact_edit'),
    path('<int:pk>/radera/', redirect_to_frontend, name='contact_delete'),

    # Kategorier
    path('kategorier/', redirect_to_frontend, name='category_list'),
    path('kategorier/<int:pk>/radera/', redirect_to_frontend, name='category_delete'),
    path('<path:path>/', redirect_to_frontend),
]
