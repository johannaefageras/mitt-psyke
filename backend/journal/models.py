from django.db import models
from django.conf import settings
from django.utils import timezone
from django.db.models.signals import post_delete, m2m_changed
from django.dispatch import receiver


class JournalTag(models.Model):
    """Användarens egna etiketter för dagboksinlägg."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_tags'
    )
    name = models.CharField(max_length=50, verbose_name='Namn')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'name']
        ordering = ['name']
        verbose_name = 'Etikett'
        verbose_name_plural = 'Etiketter'

    def __str__(self):
        return self.name


class JournalEntry(models.Model):
    """Ett dagboksinlägg."""

    # Humör - värden 1-11, kommer visas som SVG-ikoner i UI
    MOOD_CHOICES = [
        (1, 'Väldigt dåligt'),
        (2, 'Dåligt'),
        (3, 'Ganska dåligt'),
        (4, 'Lite dåligt'),
        (5, 'Neutralt'),
        (6, 'Lite bra'),
        (7, 'Ganska bra'),
        (8, 'Bra'),
        (9, 'Väldigt bra'),
        (10, 'Fantastiskt'),
        (11, 'Bästa möjliga'),
    ]

    # Sömnkvalitet - värden 1-5
    SLEEP_QUALITY_CHOICES = [
        (1, 'Väldigt dålig'),
        (2, 'Dålig'),
        (3, 'Okej'),
        (4, 'Bra'),
        (5, 'Väldigt bra'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_entries'
    )

    # Datum och tid
    date = models.DateField(
        default=timezone.localdate,
        verbose_name='Datum'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Mående-tracking (alla valfria)
    mood = models.IntegerField(
        choices=MOOD_CHOICES,
        null=True,
        blank=True,
        verbose_name='Humör'
    )
    sleep_hours = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        null=True,
        blank=True,
        verbose_name='Antal timmar sömn'
    )
    sleep_quality = models.IntegerField(
        choices=SLEEP_QUALITY_CHOICES,
        null=True,
        blank=True,
        verbose_name='Sömnkvalitet'
    )
    energy_level = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Energinivå',
        help_text='1-10'
    )
    anxiety_level = models.IntegerField(
        null=True,
        blank=True,
        verbose_name='Ångestnivå',
        help_text='1-10'
    )

    # Reflektioner (alla valfria)
    grateful_for = models.TextField(
        blank=True,
        verbose_name='Tacksam för',
        help_text='Något positivt från dagen'
    )
    looking_forward_to = models.TextField(
        blank=True,
        verbose_name='Ser fram emot',
        help_text='Något att se fram emot imorgon'
    )
    affirmation = models.TextField(
        blank=True,
        verbose_name='Dagens påminnelse',
        help_text='Något du vill säga till dig själv'
    )

    # Huvudinnehåll
    content = models.TextField(
        blank=True,
        verbose_name='Dagbok',
        help_text='Skriv fritt'
    )

    # Metadata
    tags = models.ManyToManyField(
        JournalTag,
        blank=True,
        related_name='entries',
        verbose_name='Etiketter'
    )
    is_pinned = models.BooleanField(
        default=False,
        verbose_name='Fäst inlägg'
    )

    class Meta:
        ordering = ['-is_pinned', '-date', '-created_at']
        verbose_name = 'Dagboksinlägg'
        verbose_name_plural = 'Dagboksinlägg'

    def __str__(self):
        return self.formatted_date

    @property
    def formatted_date(self):
        """Returnerar 'Mån 22 december 2025'-format."""
        weekdays = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön']
        months = [
            '', 'januari', 'februari', 'mars', 'april', 'maj', 'juni',
            'juli', 'augusti', 'september', 'oktober', 'november', 'december'
        ]
        weekday = weekdays[self.date.weekday()]
        month = months[self.date.month]
        return f"{weekday} {self.date.day} {month} {self.date.year}"

    @property
    def has_tracking_data(self):
        """Returnerar True om någon tracking-data finns."""
        return any([
            self.mood is not None,
            self.sleep_hours is not None,
            self.sleep_quality is not None,
            self.energy_level is not None,
            self.anxiety_level is not None
        ])

    @property
    def has_reflections(self):
        """Returnerar True om någon reflektion finns."""
        return any([
            self.grateful_for,
            self.looking_forward_to,
            self.affirmation
        ])

    @property
    def is_empty(self):
        """Returnerar True om inlägget är helt tomt."""
        return not any([
            self.has_tracking_data,
            self.has_reflections,
            self.content
        ])


# Signals för automatisk städning av oanvända etiketter

@receiver(post_delete, sender=JournalEntry)
def cleanup_unused_tags_on_entry_delete(sender, instance, **kwargs):
    """Ta bort etiketter som inte längre används när ett inlägg raderas."""
    JournalTag.objects.filter(
        user=instance.user,
        entries__isnull=True
    ).delete()


@receiver(m2m_changed, sender=JournalEntry.tags.through)
def cleanup_unused_tags_on_tag_change(sender, instance, action, **kwargs):
    """Ta bort etiketter som inte längre används när taggar ändras."""
    if action in ['post_remove', 'post_clear']:
        JournalTag.objects.filter(
            user=instance.user,
            entries__isnull=True
        ).delete()
