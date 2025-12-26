from django.core.management.base import BaseCommand
from journal.models import JournalTag


class Command(BaseCommand):
    help = 'Ta bort etiketter som inte längre används av något dagboksinlägg'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Visa vad som skulle raderas utan att faktiskt radera',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        
        # Hitta alla etiketter utan inlägg
        unused_tags = JournalTag.objects.filter(entries__isnull=True)
        count = unused_tags.count()
        
        if count == 0:
            self.stdout.write(
                self.style.SUCCESS('Inga oanvända etiketter hittades.')
            )
            return
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(f'Skulle radera {count} oanvända etiketter:')
            )
            for tag in unused_tags:
                self.stdout.write(f'  - "{tag.name}" (användare: {tag.user.username})')
        else:
            # Lista innan vi raderar
            self.stdout.write(f'Raderar {count} oanvända etiketter:')
            for tag in unused_tags:
                self.stdout.write(f'  - "{tag.name}" (användare: {tag.user.username})')
            
            unused_tags.delete()
            
            self.stdout.write(
                self.style.SUCCESS(f'Klart! {count} etiketter raderades.')
            )
