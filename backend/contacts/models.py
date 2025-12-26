from django.db import models
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver


class ContactCategory(models.Model):
    """Användarens egna kategorier för kontakter."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contact_categories'
    )
    name = models.CharField(max_length=50, verbose_name='Namn')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'name']
        ordering = ['name']
        verbose_name = 'Kategori'
        verbose_name_plural = 'Kategorier'

    def __str__(self):
        return self.name


class Contact(models.Model):
    """En kontakt i användarens kontaktbok."""

    CONTACT_TYPE_CHOICES = [
        ('healthcare', 'Sjukvård'),
        ('psychiatry', 'Psykiatri'),
        ('psychology', 'Psykolog'),
        ('counselor', 'Kurator'),
        ('social_services', 'Socialtjänst'),
        ('contact_person', 'Kontaktperson'),
        ('housing_support', 'Boendestöd'),
        ('support_person', 'Stödperson'),
        ('family', 'Familj'),
        ('friend', 'Vän'),
        ('other', 'Övrigt'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contacts'
    )

    # Core fields
    name = models.CharField(
        max_length=100,
        verbose_name='Namn'
    )
    contact_type = models.CharField(
        max_length=20,
        choices=CONTACT_TYPE_CHOICES,
        default='other',
        verbose_name='Kontakttyp'
    )
    phone = models.CharField(
        max_length=30,
        blank=True,
        verbose_name='Telefonnummer'
    )
    email = models.EmailField(
        blank=True,
        verbose_name='E-postadress'
    )
    organization = models.CharField(
        max_length=100,
        blank=True,
        verbose_name='Organisation'
    )
    address = models.TextField(
        blank=True,
        verbose_name='Besöksadress'
    )
    notes = models.TextField(
        blank=True,
        verbose_name='Anteckningar'
    )

    # Category relation
    category = models.ForeignKey(
        ContactCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='contacts',
        verbose_name='Kategori'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Uppdaterad')

    # Future calendar integration placeholder
    # next_appointment = models.DateTimeField(
    #     null=True,
    #     blank=True,
    #     verbose_name='Nästa besök'
    # )

    class Meta:
        ordering = ['name']
        verbose_name = 'Kontakt'
        verbose_name_plural = 'Kontakter'

    def __str__(self):
        return self.name

    @property
    def contact_type_label(self):
        """Returnerar den svenska etiketten för kontakttypen."""
        return dict(self.CONTACT_TYPE_CHOICES).get(self.contact_type, self.contact_type)

    @property
    def has_contact_info(self):
        """Returnerar True om kontakten har telefon eller e-post."""
        return bool(self.phone or self.email)


# Signal för automatisk städning av oanvända kategorier

@receiver(post_delete, sender=Contact)
def cleanup_unused_categories_on_contact_delete(sender, instance, **kwargs):
    """Ta bort kategorier som inte längre används när en kontakt raderas."""
    if instance.category:
        ContactCategory.objects.filter(
            user=instance.user,
            contacts__isnull=True
        ).delete()
