import json
import logging
import os
import urllib.error
import urllib.request
from datetime import datetime
from zoneinfo import ZoneInfo

from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_http_methods

from accounts.forms import CustomUserCreationForm
from accounts.models import Profile, SWEDISH_REGION_CHOICES
from accounts.views import send_verification_email
from contacts.forms import ContactForm
from contacts.models import Contact, ContactCategory
from journal.forms import JournalEntryForm
from journal.models import JournalEntry, JournalTag
from .chat_prompt import SYSTEM_PROMPT
from .models import Hotline, Quote, SupportLine, SupportLineCategory

logger = logging.getLogger(__name__)


def _json_response(payload):
    return JsonResponse(payload, safe=False, json_dumps_params={'ensure_ascii': False})


_OPENAI_API_KEY = None


def _load_openai_api_key():
    global _OPENAI_API_KEY
    if _OPENAI_API_KEY:
        return _OPENAI_API_KEY

    api_key = os.environ.get('OPENAI_API_KEY')
    if api_key:
        _OPENAI_API_KEY = api_key
        return api_key

    env_path = settings.BASE_DIR.parent / '.env'
    if not env_path.exists():
        return None

    try:
        for line in env_path.read_text(encoding='utf-8').splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith('#') or '=' not in stripped:
                continue
            key, value = stripped.split('=', 1)
            if key.strip() == 'OPENAI_API_KEY':
                api_key = value.strip().strip('"').strip("'")
                if api_key:
                    _OPENAI_API_KEY = api_key
                return api_key
    except OSError:
        return None

    return None


def _format_chat_context(context, external_sources):
    lines = []

    if context:
        lines.append('## Relevant innehåll från sajten:')
        lines.append('')
        for item in context:
            if not isinstance(item, dict):
                continue
            title = item.get('title') or 'Okänd källa'
            lines.append(f'### {title}')
            type_label = item.get('type') or 'okänd'
            type_line = f'Typ: {type_label}'
            category = item.get('category')
            if category:
                type_line += f' | Kategori: {category}'
            lines.append(type_line)
            content = item.get('content')
            if content:
                lines.append(str(content))
            lines.append('')

    if external_sources:
        lines.append('## Stödlinjer och resurser:')
        lines.append('')
        for source in external_sources:
            if not isinstance(source, dict):
                continue
            title = source.get('title') or source.get('name') or 'Källa'
            lines.append(f'### {title}')
            phone = source.get('phone')
            if phone:
                lines.append(f'Telefon: {phone}')
            url = source.get('url')
            if url:
                lines.append(f'Webb: {url}')
            hours = source.get('hoursLabel') or source.get('hours')
            if hours:
                lines.append(f'Öppettider: {hours}')
            contact_types = source.get('contactTypes')
            if isinstance(contact_types, (list, tuple)) and contact_types:
                lines.append(f'Kontaktvägar: {", ".join(contact_types)}')
            lines.append('')

    return '\n'.join(lines).strip()


def _build_chat_messages(messages, context_text):
    openai_messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]

    if context_text:
        now = datetime.now(ZoneInfo('Europe/Stockholm')).strftime('%Y-%m-%d %H:%M:%S')
        time_info = f'Aktuell tid i Sverige: {now}\n\n'
        openai_messages.append({'role': 'system', 'content': time_info + context_text})

    for msg in messages:
        if not isinstance(msg, dict):
            continue
        role = msg.get('role')
        if role == 'bot':
            role = 'assistant'
        if role not in ('user', 'assistant'):
            continue
        content = msg.get('content')
        if content is None:
            continue
        openai_messages.append({'role': role, 'content': str(content)})

    return openai_messages


def _serialize_support_line(line):
    return {
        'id': line.id,
        'title': line.title,
        'resource': line.resource or {},
        'contactTypes': line.contact_types or [],
        'phone': line.phone,
        'description': line.description,
        'category': line.category,
        'urgent': line.urgent,
        'tags': line.tags or [],
        'availability': line.availability or {},
        'lastVerified': line.last_verified.isoformat() if line.last_verified else None,
        'active': line.active,
    }


def _serialize_category(category):
    return {
        'slug': category.slug,
        'title': category.title,
        'summary': category.summary,
        'description': category.description,
        'icon': category.icon,
    }


def _serialize_hotline(hotline):
    return {
        'name': hotline.name,
        'number': hotline.number,
        'tel': hotline.tel,
        'availability': hotline.availability,
        'variant': hotline.variant or None,
        'footerLabel': hotline.footer_label,
    }


def _serialize_quote(quote):
    return {
        'text': quote.text,
        'author': quote.author,
    }


def _serialize_profile(request, profile):
    user = profile.user
    avatar_url = None
    if profile.avatar:
        avatar_url = request.build_absolute_uri(profile.avatar.url)

    return {
        'username': user.username,
        'email': user.email,
        'displayName': profile.display_name,
        'municipality': profile.municipality,
        'emailVerified': profile.email_verified,
        'avatarUrl': avatar_url,
        'dateJoined': user.date_joined.isoformat(),
    }


def _payload_has_key(payload, key):
    try:
        return key in payload
    except TypeError:
        return False


def _payload_get(payload, *keys):
    for key in keys:
        if _payload_has_key(payload, key):
            return payload.get(key)
    return None


def _parse_payload(request):
    if request.content_type and 'application/json' in request.content_type:
        try:
            return json.loads(request.body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            return None
    return request.POST


def _serialize_journal_entry(entry):
    return {
        'id': entry.id,
        'date': entry.date.isoformat() if entry.date else None,
        'formattedDate': entry.formatted_date,
        'mood': entry.mood,
        'moodLabel': entry.get_mood_display() if entry.mood else None,
        'sleepHours': float(entry.sleep_hours) if entry.sleep_hours is not None else None,
        'sleepQuality': entry.sleep_quality,
        'sleepQualityLabel': entry.get_sleep_quality_display() if entry.sleep_quality else None,
        'energyLevel': entry.energy_level,
        'anxietyLevel': entry.anxiety_level,
        'gratefulFor': entry.grateful_for,
        'lookingForwardTo': entry.looking_forward_to,
        'affirmation': entry.affirmation,
        'content': entry.content,
        'tags': [tag.name for tag in entry.tags.all()],
        'isPinned': entry.is_pinned,
        'hasTrackingData': entry.has_tracking_data,
        'hasReflections': entry.has_reflections,
        'createdAt': entry.created_at.isoformat(),
        'updatedAt': entry.updated_at.isoformat(),
    }


def _journal_form_data(payload, entry=None):
    data = {}

    def field_value(keys, fallback):
        if any(_payload_has_key(payload, key) for key in keys):
            return _payload_get(payload, *keys)
        return fallback

    data['date'] = field_value(('date',), entry.date if entry else None)
    data['mood'] = field_value(('mood',), entry.mood if entry else None)
    data['sleep_hours'] = field_value(
        ('sleep_hours', 'sleepHours'),
        entry.sleep_hours if entry else None,
    )
    data['sleep_quality'] = field_value(
        ('sleep_quality', 'sleepQuality'),
        entry.sleep_quality if entry else None,
    )
    data['energy_level'] = field_value(
        ('energy_level', 'energyLevel'),
        entry.energy_level if entry else None,
    )
    data['anxiety_level'] = field_value(
        ('anxiety_level', 'anxietyLevel'),
        entry.anxiety_level if entry else None,
    )
    data['grateful_for'] = field_value(
        ('grateful_for', 'gratefulFor'),
        entry.grateful_for if entry else '',
    )
    data['looking_forward_to'] = field_value(
        ('looking_forward_to', 'lookingForwardTo'),
        entry.looking_forward_to if entry else '',
    )
    data['affirmation'] = field_value(
        ('affirmation',),
        entry.affirmation if entry else '',
    )
    data['content'] = field_value(
        ('content',),
        entry.content if entry else '',
    )

    tags_value = field_value(
        ('tags', 'tagsInput', 'tags_input'),
        ', '.join(entry.tags.values_list('name', flat=True)) if entry else '',
    )
    if isinstance(tags_value, (list, tuple)):
        tags_value = ', '.join([str(tag).strip() for tag in tags_value if str(tag).strip()])
    data['tags_input'] = tags_value or ''

    if _payload_has_key(payload, 'isPinned') or _payload_has_key(payload, 'is_pinned'):
        pinned_value = _payload_get(payload, 'isPinned', 'is_pinned')
        if isinstance(payload, dict):
            data['is_pinned'] = bool(pinned_value)
        else:
            data['is_pinned'] = pinned_value
    elif entry is not None:
        data['is_pinned'] = entry.is_pinned

    return data


@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'detail': 'CSRF cookie set.'})


@require_http_methods(['POST'])
def auth_login(request):
    payload = _parse_payload(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

    identifier = _payload_get(payload, 'username', 'email', 'identifier')
    password = _payload_get(payload, 'password')

    if not identifier or not password:
        return JsonResponse({'detail': 'Missing credentials.'}, status=400)

    username = identifier
    if '@' in identifier:
        user_match = User.objects.filter(email__iexact=identifier).first()
        if user_match:
            username = user_match.username

    user = authenticate(request, username=username, password=password)
    if not user:
        return JsonResponse({'detail': 'Invalid credentials.'}, status=401)

    login(request, user)
    profile, _created = Profile.objects.get_or_create(user=user)
    return _json_response({
        'detail': 'Logged in.',
        'user': _serialize_profile(request, profile),
    })


@require_http_methods(['POST'])
def auth_logout(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    logout(request)
    return JsonResponse({'detail': 'Logged out.'})


@require_http_methods(['POST'])
def auth_register(request):
    payload = _parse_payload(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

    form_data = {
        'username': _payload_get(payload, 'username'),
        'email': _payload_get(payload, 'email'),
        'password1': _payload_get(payload, 'password', 'password1'),
        'password2': _payload_get(payload, 'password_confirm', 'password2'),
    }

    form = CustomUserCreationForm(form_data)
    if not form.is_valid():
        return JsonResponse({'detail': 'Validation error.', 'errors': form.errors}, status=400)

    user = form.save()
    send_verification_email(request, user)
    login(request, user)
    profile, _created = Profile.objects.get_or_create(user=user)
    return _json_response({
        'detail': 'Registered.',
        'user': _serialize_profile(request, profile),
    })


@require_http_methods(['POST'])
def auth_resend_verification(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    user = request.user
    profile, _created = Profile.objects.get_or_create(user=user)
    if not profile.email_verified:
        send_verification_email(request, request.user)
        return JsonResponse({'detail': 'Verification email sent.'})

    return JsonResponse({'detail': 'Email already verified.'})


@require_GET
def support_lines(request):
    lines = SupportLine.objects.filter(active=True).order_by('id')
    payload = [_serialize_support_line(line) for line in lines]
    return _json_response(payload)


@require_GET
def support_line_categories(request):
    categories = SupportLineCategory.objects.filter(active=True).order_by('order', 'slug')
    payload = [_serialize_category(category) for category in categories]
    return _json_response(payload)


@require_GET
def hotlines(request):
    entries = Hotline.objects.filter(active=True).order_by('order', 'name')
    payload = [_serialize_hotline(entry) for entry in entries]
    return _json_response(payload)


@require_GET
def quotes(request):
    entries = Quote.objects.filter(active=True).order_by('order', 'id')
    payload = [_serialize_quote(entry) for entry in entries]
    return _json_response(payload)


@csrf_exempt
@require_http_methods(['POST'])
def chatbot(request):
    payload = _parse_payload(request)
    if payload is None or not isinstance(payload, dict):
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

    messages = payload.get('messages')
    if not isinstance(messages, list) or not messages:
        return JsonResponse({'detail': 'Invalid payload.'}, status=400)

    context = payload.get('context')
    if not isinstance(context, list):
        context = []

    external_sources = payload.get('externalSources')
    if not isinstance(external_sources, list):
        external_sources = []

    api_key = _load_openai_api_key()
    if not api_key:
        logger.error('OPENAI_API_KEY saknas')
        return JsonResponse({'error': 'Server configuration error'}, status=500)

    context_text = _format_chat_context(context, external_sources)
    openai_messages = _build_chat_messages(messages, context_text)

    request_payload = {
        'model': 'gpt-4o',
        'messages': openai_messages,
        'temperature': 0.7,
        'max_tokens': 1000,
    }

    data = None
    try:
        req = urllib.request.Request(
            'https://api.openai.com/v1/chat/completions',
            data=json.dumps(request_payload).encode('utf-8'),
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {api_key}',
            },
            method='POST',
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            body = response.read().decode('utf-8')
        data = json.loads(body)
    except urllib.error.HTTPError as err:
        error_body = err.read().decode('utf-8', errors='replace')
        logger.error('OpenAI API error: %s', error_body)
        return JsonResponse({'error': 'AI service error'}, status=err.code or 502)
    except urllib.error.URLError as err:
        logger.error('OpenAI API error: %s', err)
        return JsonResponse({'error': 'AI service error'}, status=502)
    except json.JSONDecodeError as err:
        logger.error('OpenAI API invalid JSON: %s', err)
        return JsonResponse({'error': 'AI service error'}, status=502)
    except Exception as err:
        logger.exception('Function error: %s', err)
        return JsonResponse({'error': 'Internal server error'}, status=500)

    answer = (
        data.get('choices', [{}])[0]
        .get('message', {})
        .get('content')
        if isinstance(data, dict)
        else None
    )
    if not answer:
        answer = 'Jag kunde inte generera ett svar.'

    sources = []
    for item in context:
        if not isinstance(item, dict):
            continue
        item_copy = dict(item)
        item_copy['url'] = item_copy.get('url') or None
        sources.append(item_copy)

    return _json_response({
        'answer': answer,
        'sources': sources,
    })


@require_GET
def me(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    profile, _created = Profile.objects.get_or_create(user=request.user)
    return _json_response(_serialize_profile(request, profile))


def me_update(request):
    if request.method != 'POST':
        return JsonResponse({'detail': 'Method not allowed.'}, status=405)

    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    user = request.user
    profile, _created = Profile.objects.get_or_create(user=request.user)

    valid_municipalities = {value for value, _label in SWEDISH_REGION_CHOICES}

    if request.content_type and 'application/json' in request.content_type:
        try:
            payload = json.loads(request.body.decode('utf-8') or '{}')
        except json.JSONDecodeError:
            return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

        display_name = payload.get('displayName')
        municipality = payload.get('municipality')
        email = payload.get('email')

        if display_name is not None:
            profile.display_name = str(display_name)[:80]
        if municipality is not None:
            municipality_value = str(municipality)[:100]
            if municipality_value not in valid_municipalities:
                return JsonResponse(
                    {'detail': 'Invalid municipality value.'},
                    status=400,
                )
            profile.municipality = municipality_value
        if email is not None:
            email_value = str(email).strip()
            if email_value and email_value != user.email:
                user.email = email_value
                profile.email_verified = False
                send_verification_email(request, user)
                user.save()
        profile.save()

        return _json_response(_serialize_profile(request, profile))

    display_name = request.POST.get('displayName')
    municipality = request.POST.get('municipality')
    email = request.POST.get('email')
    avatar = request.FILES.get('avatar')

    if display_name is not None:
        profile.display_name = display_name[:80]
    if municipality is not None:
        municipality_value = municipality[:100]
        if municipality_value not in valid_municipalities:
            return JsonResponse(
                {'detail': 'Invalid municipality value.'},
                status=400,
            )
        profile.municipality = municipality_value
    if email is not None:
        email_value = email.strip()
        if email_value and email_value != user.email:
            user.email = email_value
            profile.email_verified = False
            send_verification_email(request, user)
            user.save()
    if avatar is not None:
        profile.avatar = avatar

    profile.save()

    return _json_response(_serialize_profile(request, profile))


@require_http_methods(['GET', 'POST'])
def journal_entries(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    if request.method == 'GET':
        entries = JournalEntry.objects.filter(user=request.user)

        tag_filter = request.GET.get('tag')
        if tag_filter:
            entries = entries.filter(tags__name=tag_filter)

        search_query = request.GET.get('q')
        if search_query:
            entries = entries.filter(
                Q(content__icontains=search_query) |
                Q(grateful_for__icontains=search_query) |
                Q(looking_forward_to__icontains=search_query) |
                Q(affirmation__icontains=search_query)
            ).distinct()

        payload = [_serialize_journal_entry(entry) for entry in entries]
        return _json_response(payload)

    payload = _parse_payload(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

    form = JournalEntryForm(_journal_form_data(payload), user=request.user)
    if not form.is_valid():
        return JsonResponse({'detail': 'Validation error.', 'errors': form.errors}, status=400)

    entry = form.save()
    return _json_response(_serialize_journal_entry(entry))


@require_http_methods(['GET', 'PATCH', 'PUT', 'DELETE'])
def journal_entry_detail(request, entry_id):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    entry = JournalEntry.objects.filter(user=request.user, pk=entry_id).first()
    if not entry:
        return JsonResponse({'detail': 'Entry not found.'}, status=404)

    if request.method == 'GET':
        return _json_response(_serialize_journal_entry(entry))

    if request.method == 'DELETE':
        entry.delete()
        return JsonResponse({'detail': 'Entry deleted.'})

    payload = _parse_payload(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

    form = JournalEntryForm(_journal_form_data(payload, entry=entry), instance=entry, user=request.user)
    if not form.is_valid():
        return JsonResponse({'detail': 'Validation error.', 'errors': form.errors}, status=400)

    entry = form.save()
    return _json_response(_serialize_journal_entry(entry))


@require_GET
def journal_tags(request):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    tags = JournalTag.objects.filter(user=request.user).annotate(entry_count=Count('entries'))
    payload = [
        {
            'id': tag.id,
            'name': tag.name,
            'entryCount': tag.entry_count,
        }
        for tag in tags
    ]
    return _json_response(payload)


@require_http_methods(['DELETE'])
def journal_tag_detail(request, tag_id):
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    tag = JournalTag.objects.filter(user=request.user, pk=tag_id).first()
    if not tag:
        return JsonResponse({'detail': 'Tag not found.'}, status=404)

    tag.delete()
    return JsonResponse({'detail': 'Tag deleted.'})


# =============================================================================
# Contacts API
# =============================================================================

def _serialize_contact(contact):
    return {
        'id': contact.id,
        'name': contact.name,
        'contactType': contact.contact_type,
        'contactTypeLabel': contact.contact_type_label,
        'phone': contact.phone,
        'email': contact.email,
        'organization': contact.organization,
        'address': contact.address,
        'notes': contact.notes,
        'category': contact.category.name if contact.category else None,
        'categoryId': contact.category.id if contact.category else None,
        'hasContactInfo': contact.has_contact_info,
        'createdAt': contact.created_at.isoformat(),
        'updatedAt': contact.updated_at.isoformat(),
    }


def _contact_form_data(payload, contact=None):
    """Build form data from JSON payload, supporting both snake_case and camelCase."""
    data = {}

    def field_value(keys, fallback):
        if any(_payload_has_key(payload, key) for key in keys):
            return _payload_get(payload, *keys)
        return fallback

    data['name'] = field_value(
        ('name',),
        contact.name if contact else ''
    )
    data['contact_type'] = field_value(
        ('contact_type', 'contactType'),
        contact.contact_type if contact else 'other'
    )
    data['phone'] = field_value(
        ('phone',),
        contact.phone if contact else ''
    )
    data['email'] = field_value(
        ('email',),
        contact.email if contact else ''
    )
    data['organization'] = field_value(
        ('organization',),
        contact.organization if contact else ''
    )
    data['address'] = field_value(
        ('address',),
        contact.address if contact else ''
    )
    data['notes'] = field_value(
        ('notes',),
        contact.notes if contact else ''
    )

    # Category can be passed as name string or category_input
    category_value = field_value(
        ('category', 'category_input', 'categoryInput'),
        contact.category.name if contact and contact.category else ''
    )
    data['category_input'] = category_value or ''

    return data


@require_http_methods(['GET', 'POST'])
def contacts_list(request):
    """List all contacts or create a new contact."""
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    if request.method == 'GET':
        contacts = Contact.objects.filter(user=request.user)

        # Filter by category
        category_filter = request.GET.get('category')
        if category_filter:
            contacts = contacts.filter(category__name=category_filter)

        # Filter by contact type
        type_filter = request.GET.get('type')
        if type_filter:
            contacts = contacts.filter(contact_type=type_filter)

        # Search
        search_query = request.GET.get('q')
        if search_query:
            contacts = contacts.filter(
                Q(name__icontains=search_query) |
                Q(organization__icontains=search_query) |
                Q(phone__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(notes__icontains=search_query)
            ).distinct()

        payload = [_serialize_contact(contact) for contact in contacts]
        return _json_response(payload)

    # POST - create new contact
    payload = _parse_payload(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

    form = ContactForm(_contact_form_data(payload), user=request.user)
    if not form.is_valid():
        return JsonResponse({'detail': 'Validation error.', 'errors': form.errors}, status=400)

    contact = form.save()
    return _json_response(_serialize_contact(contact))


@require_http_methods(['GET', 'PATCH', 'PUT', 'DELETE'])
def contact_detail(request, contact_id):
    """Get, update, or delete a specific contact."""
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    contact = Contact.objects.filter(user=request.user, pk=contact_id).first()
    if not contact:
        return JsonResponse({'detail': 'Contact not found.'}, status=404)

    if request.method == 'GET':
        return _json_response(_serialize_contact(contact))

    if request.method == 'DELETE':
        contact.delete()
        return JsonResponse({'detail': 'Contact deleted.'})

    # PATCH/PUT - update contact
    payload = _parse_payload(request)
    if payload is None:
        return JsonResponse({'detail': 'Invalid JSON.'}, status=400)

    form = ContactForm(_contact_form_data(payload, contact=contact), instance=contact, user=request.user)
    if not form.is_valid():
        return JsonResponse({'detail': 'Validation error.', 'errors': form.errors}, status=400)

    contact = form.save()
    return _json_response(_serialize_contact(contact))


@require_GET
def contact_categories(request):
    """List all contact categories for the current user."""
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    categories = ContactCategory.objects.filter(user=request.user).annotate(
        contact_count=Count('contacts')
    )
    payload = [
        {
            'id': category.id,
            'name': category.name,
            'contactCount': category.contact_count,
        }
        for category in categories
    ]
    return _json_response(payload)


@require_http_methods(['DELETE'])
def contact_category_detail(request, category_id):
    """Delete a specific contact category."""
    if not request.user.is_authenticated:
        return JsonResponse({'detail': 'Authentication required.'}, status=401)

    category = ContactCategory.objects.filter(user=request.user, pk=category_id).first()
    if not category:
        return JsonResponse({'detail': 'Category not found.'}, status=404)

    category.delete()
    return JsonResponse({'detail': 'Category deleted.'})


@require_GET
def contact_types(request):
    """List all available contact types."""
    payload = [
        {'value': value, 'label': label}
        for value, label in Contact.CONTACT_TYPE_CHOICES
    ]
    return _json_response(payload)
