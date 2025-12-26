from django.urls import path

from . import views

app_name = 'api'

urlpatterns = [
    path('v1/csrf/', views.csrf, name='csrf'),
    path('v1/auth/login/', views.auth_login, name='auth_login'),
    path('v1/auth/logout/', views.auth_logout, name='auth_logout'),
    path('v1/auth/register/', views.auth_register, name='auth_register'),
    path('v1/auth/resend-verification/', views.auth_resend_verification, name='auth_resend_verification'),
    path('v1/support-lines/', views.support_lines, name='support_lines'),
    path('v1/support-line-categories/', views.support_line_categories, name='support_line_categories'),
    path('v1/hotlines/', views.hotlines, name='hotlines'),
    path('v1/quotes/', views.quotes, name='quotes'),
    path('v1/me/', views.me, name='me'),
    path('v1/me/update/', views.me_update, name='me_update'),
    path('v1/journal/entries/', views.journal_entries, name='journal_entries'),
    path('v1/journal/entries/<int:entry_id>/', views.journal_entry_detail, name='journal_entry_detail'),
    path('v1/journal/tags/', views.journal_tags, name='journal_tags'),
    path('v1/journal/tags/<int:tag_id>/', views.journal_tag_detail, name='journal_tag_detail'),
    # Contacts
    path('v1/contacts/', views.contacts_list, name='contacts_list'),
    path('v1/contacts/<int:contact_id>/', views.contact_detail, name='contact_detail'),
    path('v1/contacts/categories/', views.contact_categories, name='contact_categories'),
    path('v1/contacts/categories/<int:category_id>/', views.contact_category_detail, name='contact_category_detail'),
    path('v1/contacts/types/', views.contact_types, name='contact_types'),
]
