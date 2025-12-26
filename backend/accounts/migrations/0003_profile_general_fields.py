from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0002_profile_avatar'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='display_name',
            field=models.CharField(blank=True, max_length=80),
        ),
        migrations.AddField(
            model_name='profile',
            name='municipality',
            field=models.CharField(
                blank=True,
                choices=[
                    ('', 'Välj kommun/region'),
                    ('Blekinge län', 'Blekinge län'),
                    ('Dalarnas län', 'Dalarnas län'),
                    ('Gotlands län', 'Gotlands län'),
                    ('Gävleborgs län', 'Gävleborgs län'),
                    ('Hallands län', 'Hallands län'),
                    ('Jämtlands län', 'Jämtlands län'),
                    ('Jönköpings län', 'Jönköpings län'),
                    ('Kalmar län', 'Kalmar län'),
                    ('Kronobergs län', 'Kronobergs län'),
                    ('Norrbottens län', 'Norrbottens län'),
                    ('Skåne län', 'Skåne län'),
                    ('Stockholms län', 'Stockholms län'),
                    ('Södermanlands län', 'Södermanlands län'),
                    ('Uppsala län', 'Uppsala län'),
                    ('Värmlands län', 'Värmlands län'),
                    ('Västerbottens län', 'Västerbottens län'),
                    ('Västernorrlands län', 'Västernorrlands län'),
                    ('Västmanlands län', 'Västmanlands län'),
                    ('Västra Götalands län', 'Västra Götalands län'),
                    ('Örebro län', 'Örebro län'),
                    ('Östergötlands län', 'Östergötlands län'),
                ],
                max_length=100,
            ),
        ),
        migrations.RemoveField(
            model_name='profile',
            name='bio',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='birth_date',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='location',
        ),
        migrations.RemoveField(
            model_name='profile',
            name='phone',
        ),
    ]
