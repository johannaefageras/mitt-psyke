from django import forms
from .models import JournalEntry, JournalTag


class JournalEntryForm(forms.ModelForm):
    """Formulär för att skapa och redigera dagboksinlägg."""

    # Egna taggar som kommaseparerad sträng
    tags_input = forms.CharField(
        required=False,
        label='Etiketter',
        widget=forms.TextInput(attrs={
            'placeholder': 'T.ex. terapi, bra dag, familj',
            'class': 'tags-input'
        }),
        help_text='Separera med kommatecken'
    )

    class Meta:
        model = JournalEntry
        fields = [
            'date',
            'mood',
            'sleep_hours',
            'sleep_quality',
            'energy_level',
            'anxiety_level',
            'grateful_for',
            'looking_forward_to',
            'affirmation',
            'content',
            'is_pinned',
        ]
        widgets = {
            'date': forms.DateInput(attrs={'type': 'date'}),
            'mood': forms.RadioSelect(attrs={'class': 'mood-selector'}),
            'sleep_hours': forms.NumberInput(attrs={
                'min': '0',
                'max': '24',
                'step': '0.5',
                'placeholder': 'T.ex. 7.5'
            }),
            'sleep_quality': forms.RadioSelect(attrs={'class': 'quality-selector'}),
            'energy_level': forms.NumberInput(attrs={
                'min': '1',
                'max': '10',
                'placeholder': '1-10'
            }),
            'anxiety_level': forms.NumberInput(attrs={
                'min': '1',
                'max': '10',
                'placeholder': '1-10'
            }),
            'grateful_for': forms.Textarea(attrs={
                'rows': 2,
                'placeholder': 'Vad är du tacksam för idag?',
                'class': 'journal-textarea',
                'style': 'resize: none;'
            }),
            'looking_forward_to': forms.Textarea(attrs={
                'rows': 2,
                'placeholder': 'Något att se fram emot imorgon?',
                'class': 'journal-textarea',
                'style': 'resize: none;'
            }),
            'affirmation': forms.Textarea(attrs={
                'rows': 2,
                'placeholder': 'En påminnelse till dig själv...',
                'class': 'journal-textarea',
                'style': 'resize: none;'
            }),
            'content': forms.Textarea(attrs={
                'rows': 8,
                'placeholder': 'Skriv fritt om din dag...',
                'class': 'journal-textarea',
                'style': 'resize: none;'
            }),
        }
        labels = {
            'date': 'Datum',
            'mood': 'Hur mår du idag?',
            'sleep_hours': 'Timmar sömn',
            'sleep_quality': 'Sömnkvalitet',
            'energy_level': 'Energinivå (1-10)',
            'anxiety_level': 'Ångestnivå (1-10)',
            'grateful_for': 'Tacksam för',
            'looking_forward_to': 'Ser fram emot',
            'affirmation': 'Dagens påminnelse',
            'content': 'Dagbok',
            'is_pinned': 'Fäst detta inlägg',
        }

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user

        # Fyll i befintliga taggar om vi redigerar
        if self.instance.pk:
            existing_tags = self.instance.tags.values_list('name', flat=True)
            self.fields['tags_input'].initial = ', '.join(existing_tags)

    def clean_energy_level(self):
        value = self.cleaned_data.get('energy_level')
        if value is not None and (value < 1 or value > 10):
            raise forms.ValidationError('Energinivå måste vara mellan 1 och 10.')
        return value

    def clean_anxiety_level(self):
        value = self.cleaned_data.get('anxiety_level')
        if value is not None and (value < 1 or value > 10):
            raise forms.ValidationError('Ångestnivå måste vara mellan 1 och 10.')
        return value

    def clean_sleep_hours(self):
        value = self.cleaned_data.get('sleep_hours')
        if value is not None and (value < 0 or value > 24):
            raise forms.ValidationError('Antal timmar måste vara mellan 0 och 24.')
        return value

    def save(self, commit=True):
        entry = super().save(commit=False)
        entry.user = self.user

        if commit:
            entry.save()
            # Hantera taggar
            self._save_tags(entry)

        return entry

    def _save_tags(self, entry):
        """Skapa och koppla taggar till inlägget."""
        tags_input = self.cleaned_data.get('tags_input', '')
        tag_names = [name.strip() for name in tags_input.split(',') if name.strip()]

        # Ta bort gamla taggar
        entry.tags.clear()

        # Skapa/hämta och lägg till nya taggar
        for name in tag_names:
            tag, created = JournalTag.objects.get_or_create(
                user=self.user,
                name=name[:50]  # Begränsa till 50 tecken
            )
            entry.tags.add(tag)

