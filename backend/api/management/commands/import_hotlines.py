import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from api.models import Hotline


class Command(BaseCommand):
    help = 'Import hotlines from a JSON file.'

    def add_arguments(self, parser):
        parser.add_argument(
            'path',
            nargs='?',
            help='Path to hotlines.json (defaults to frontend/src/_data/hotlines.json).',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Delete existing hotlines before import.',
        )

    def handle(self, *args, **options):
        path_arg = options.get('path')
        if path_arg:
            source_path = Path(path_arg)
        else:
            preferred = (
                settings.BASE_DIR.parent / 'frontend' / 'src' / '_data' / 'hotlinesData.json'
            )
            legacy = settings.BASE_DIR.parent / 'frontend' / 'src' / '_data' / 'hotlines.json'
            source_path = preferred if preferred.exists() else legacy

        if not source_path.exists():
            raise CommandError(f'JSON file not found: {source_path}')

        try:
            payload = json.loads(source_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            raise CommandError(f'Invalid JSON: {exc}') from exc

        if not isinstance(payload, list):
            raise CommandError('JSON payload must be a list of hotlines.')

        if options.get('replace'):
            Hotline.objects.all().delete()

        imported = 0
        for index, item in enumerate(payload):
            if not isinstance(item, dict):
                continue

            name = item.get('name') or ''
            if not name:
                continue

            defaults = {
                'number': item.get('number', ''),
                'tel': item.get('tel', ''),
                'availability': item.get('availability', ''),
                'variant': item.get('variant') or '',
                'footer_label': item.get('footerLabel', ''),
                'order': index,
                'active': True,
            }

            Hotline.objects.update_or_create(name=name, defaults=defaults)
            imported += 1

        self.stdout.write(self.style.SUCCESS(f'Imported {imported} hotlines.'))
