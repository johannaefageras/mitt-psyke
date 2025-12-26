from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import Contact, ContactCategory


@admin.register(ContactCategory)
class ContactCategoryAdmin(ModelAdmin):
    list_display = ('name', 'user', 'created_at')
    list_filter = ('user',)
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(Contact)
class ContactAdmin(ModelAdmin):
    list_display = ('name', 'contact_type', 'organization', 'user', 'category', 'updated_at')
    list_filter = ('user', 'contact_type', 'category')
    search_fields = ('name', 'organization', 'phone', 'email', 'notes')
    ordering = ('name',)
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Grundläggande', {
            'fields': ('user', 'name', 'contact_type', 'category')
        }),
        ('Kontaktuppgifter', {
            'fields': ('phone', 'email', 'organization', 'address')
        }),
        ('Övrigt', {
            'fields': ('notes',)
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
