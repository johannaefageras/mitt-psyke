import json
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils.dateparse import parse_date

from api.models import SupportLine


class Command(BaseCommand):
    help = 'Import support lines from a JSON file.'

    def add_arguments(self, parser):
        parser.add_argument(
            'path',
            nargs='?',
            help='Path to supportData.json (defaults to frontend/src/_data/supportData.json).',
        )
        parser.add_argument(
            '--replace',
            action='store_true',
            help='Delete existing support lines before import.',
        )

    def handle(self, *args, **options):
        path_arg = options.get('path')
        if path_arg:
            source_path = Path(path_arg)
        else:
            source_path = (
                settings.BASE_DIR.parent / 'frontend' / 'src' / '_data' / 'supportData.json'
            )

        if not source_path.exists():
            raise CommandError(f'JSON file not found: {source_path}')

        try:
            payload = json.loads(source_path.read_text(encoding='utf-8'))
        except json.JSONDecodeError as exc:
            raise CommandError(f'Invalid JSON: {exc}') from exc

        if not isinstance(payload, list):
            raise CommandError('JSON payload must be a list of support lines.')

        if options.get('replace'):
            SupportLine.objects.all().delete()

        imported = 0
        for item in payload:
            if not isinstance(item, dict):
                continue

            defaults = {
                'title': item.get('title', ''),
                'resource': item.get('resource') or {},
                'contact_types': item.get('contactTypes') or [],
                'phone': item.get('phone', ''),
                'description': item.get('description', ''),
                'category': item.get('category', ''),
                'urgent': bool(item.get('urgent', False)),
                'tags': item.get('tags') or [],
                'availability': item.get('availability') or {},
                'last_verified': parse_date(item.get('lastVerified') or ''),
                'active': bool(item.get('active', True)),
            }

            line_id = item.get('id')
            if line_id is not None:
                SupportLine.objects.update_or_create(id=line_id, defaults=defaults)
            else:
                SupportLine.objects.create(**defaults)
            imported += 1

        self.stdout.write(self.style.SUCCESS(f'Imported {imported} support lines.'))
