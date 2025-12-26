from django.contrib import admin
from unfold.admin import ModelAdmin

from .models import Hotline, Quote, SupportLine, SupportLineCategory


@admin.register(SupportLine)
class SupportLineAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'urgent', 'active', 'last_verified')
    list_filter = ('category', 'urgent', 'active')
    search_fields = ('title', 'description', 'phone')


@admin.register(SupportLineCategory)
class SupportLineCategoryAdmin(admin.ModelAdmin):
    list_display = ('title', 'slug', 'order', 'active')
    list_filter = ('active',)
    search_fields = ('title', 'slug')
    ordering = ('order', 'slug')


@admin.register(Hotline)
class HotlineAdmin(admin.ModelAdmin):
    list_display = ('name', 'number', 'availability', 'variant', 'order', 'active')
    list_filter = ('active', 'variant')
    search_fields = ('name', 'number', 'footer_label')
    ordering = ('order', 'name')


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = ('author', 'short_text', 'order', 'active')
    list_filter = ('active',)
    search_fields = ('text', 'author')
    ordering = ('order', 'id')

    def short_text(self, obj):
        return (obj.text or '')[:60]

    short_text.short_description = 'Text'
