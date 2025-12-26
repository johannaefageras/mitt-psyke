import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.models import Quote


class Command(BaseCommand):
    help = 'Import quotes from a JSON file.'

    def add_arguments(self, parser):
        parser.add_argument(
            'path',
            nargs='?',
            help='Path to quotes.json (defaults to frontend/src/_data/quotes.json).',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Delete existing quotes before import.',
        )

    def handle(self, *args, **options):
        path_arg = options.get('path')
        if path_arg:
            source_path = Path(path_arg)
        else:
            preferred = (
                settings.BASE_DIR.parent / 'frontend' / 'src' / '_data' / 'quotesData.json'
            )
            legacy = settings.BASE_DIR.parent / 'frontend' / 'src' / '_data' / 'quotes.json'
            source_path = preferred if preferred.exists() else legacy

        if not source_path.exists():
            raise CommandError(f'JSON file not found: {source_path}')

        try:
            payload = json.loads(source_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            raise CommandError(f'Invalid JSON: {exc}') from exc

        if not isinstance(payload, list):
            raise CommandError('JSON payload must be a list of quotes.')

        if options.get('replace'):
            Quote.objects.all().delete()

        imported = 0
        for index, item in enumerate(payload):
            if not isinstance(item, dict):
                continue

            text = item.get('text') or ''
            if not text:
                continue

            defaults = {
                'author': item.get('author', ''),
                'order': index,
                'active': True,
            }

            Quote.objects.update_or_create(text=text, defaults=defaults)
            imported += 1

        self.stdout.write(self.style.SUCCESS(f'Imported {imported} quotes.'))
