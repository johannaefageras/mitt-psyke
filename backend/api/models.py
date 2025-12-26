from django.db import models


class SupportLine(models.Model):
    title = models.CharField(max_length=200)
    resource = models.JSONField(default=dict, blank=True)
    contact_types = models.JSONField(default=list, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    description = models.TextField(blank=True)
    category = models.CharField(max_length=50, blank=True)
    urgent = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    availability = models.JSONField(default=dict, blank=True)
    last_verified = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return self.title


class SupportLineCategory(models.Model):
    slug = models.SlugField(max_length=50, unique=True)
    title = models.CharField(max_length=100)
    summary = models.TextField(blank=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'slug']

    def __str__(self):
        return self.title


class Hotline(models.Model):
    name = models.CharField(max_length=200)
    number = models.CharField(max_length=50, blank=True)
    tel = models.CharField(max_length=50, blank=True)
    availability = models.CharField(max_length=200, blank=True)
    variant = models.CharField(max_length=50, blank=True)
    footer_label = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class Quote(models.Model):
    text = models.TextField()
    author = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return self.text[:50]
