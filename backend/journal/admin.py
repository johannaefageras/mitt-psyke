from django.contrib import admin
from unfold.admin import ModelAdmin
from .models import JournalEntry, JournalTag


@admin.register(JournalTag)
class JournalTagAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'created_at')
    list_filter = ('user',)
    search_fields = ('name',)
    ordering = ('name',)


@admin.register(JournalEntry)
class JournalEntryAdmin(admin.ModelAdmin):
    list_display = ('formatted_date', 'user', 'mood', 'is_pinned', 'created_at')
    list_filter = ('user', 'mood', 'is_pinned', 'date')
    search_fields = ('content', 'grateful_for', 'looking_forward_to', 'affirmation')
    ordering = ('-date', '-created_at')
    date_hierarchy = 'date'
    readonly_fields = ('created_at', 'updated_at')

    fieldsets = (
        ('Grundläggande', {
            'fields': ('user', 'date', 'is_pinned')
        }),
        ('Mående', {
            'fields': ('mood', 'sleep_hours', 'sleep_quality', 'energy_level', 'anxiety_level'),
            'classes': ('collapse',)
        }),
        ('Reflektioner', {
            'fields': ('grateful_for', 'looking_forward_to', 'affirmation'),
            'classes': ('collapse',)
        }),
        ('Innehåll', {
            'fields': ('content', 'tags')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
