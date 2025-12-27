from django.contrib import admin
from .models import EmailVerificationToken, Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'display_name', 'email_verified', 'municipality', 'updated_at')
    list_filter = ('email_verified', 'municipality')
    search_fields = ('user__username', 'user__email', 'display_name')


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'created_at')
    search_fields = ('user__username', 'user__email', 'token')
