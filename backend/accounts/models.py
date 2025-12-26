import uuid
from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta

SWEDISH_REGION_CHOICES = [
    ("", "Välj kommun/region"),
    ("Blekinge län", "Blekinge län"),
    ("Dalarnas län", "Dalarnas län"),
    ("Gotlands län", "Gotlands län"),
    ("Gävleborgs län", "Gävleborgs län"),
    ("Hallands län", "Hallands län"),
    ("Jämtlands län", "Jämtlands län"),
    ("Jönköpings län", "Jönköpings län"),
    ("Kalmar län", "Kalmar län"),
    ("Kronobergs län", "Kronobergs län"),
    ("Norrbottens län", "Norrbottens län"),
    ("Skåne län", "Skåne län"),
    ("Stockholms län", "Stockholms län"),
    ("Södermanlands län", "Södermanlands län"),
    ("Uppsala län", "Uppsala län"),
    ("Värmlands län", "Värmlands län"),
    ("Västerbottens län", "Västerbottens län"),
    ("Västernorrlands län", "Västernorrlands län"),
    ("Västmanlands län", "Västmanlands län"),
    ("Västra Götalands län", "Västra Götalands län"),
    ("Örebro län", "Örebro län"),
    ("Östergötlands län", "Östergötlands län"),
]

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    display_name = models.CharField(max_length=80, blank=True)
    avatar = models.ImageField(upload_to='profile_pics/', blank=True, null=True)
    municipality = models.CharField(max_length=100, blank=True, choices=SWEDISH_REGION_CHOICES)
    email_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.username} profil'

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()

class EmailVerificationToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    token = models.UUIDField(default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def is_valid(self):
        # Token expires after 24 hours
        return self.created_at > timezone.now() - timedelta(hours=24)

    def __str__(self):
        return f'Verifieringstoken för {self.user.username}'
