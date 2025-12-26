from django.contrib.auth.decorators import login_required
from django.urls import path
from django.views.generic import RedirectView

app_name = 'journal'

redirect_to_frontend = login_required(
    RedirectView.as_view(url='/dagbok/', permanent=False)
)

urlpatterns = [
    # Dagboksinlägg
    path('', redirect_to_frontend, name='entry_list'),
    path('ny/', redirect_to_frontend, name='entry_create'),
    path('<int:pk>/', redirect_to_frontend, name='entry_detail'),
    path('<int:pk>/redigera/', redirect_to_frontend, name='entry_edit'),
    path('<int:pk>/radera/', redirect_to_frontend, name='entry_delete'),
    path('<int:pk>/fasta/', redirect_to_frontend, name='entry_toggle_pin'),

    # Etiketter
    path('etiketter/', redirect_to_frontend, name='tag_list'),
    path('etiketter/<int:pk>/radera/', redirect_to_frontend, name='tag_delete'),
    path('<path:path>/', redirect_to_frontend),
]
