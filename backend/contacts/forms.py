from django import forms
from .models import Contact, ContactCategory


class ContactForm(forms.ModelForm):
    """Formulär för att skapa och redigera kontakter."""

    category_input = forms.CharField(
        required=False,
        max_length=50,
        widget=forms.TextInput(attrs={'placeholder': 'Kategori'}),
        help_text='Skriv en kategori eller lämna tomt'
    )

    class Meta:
        model = Contact
        fields = [
            'name',
            'contact_type',
            'phone',
            'email',
            'organization',
            'address',
            'notes',
        ]

    def __init__(self, *args, user=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = user

        # Pre-fill category_input if editing existing contact
        if self.instance and self.instance.pk and self.instance.category:
            self.fields['category_input'].initial = self.instance.category.name

    def clean_category_input(self):
        category_name = self.cleaned_data.get('category_input', '').strip()
        return category_name if category_name else None

    def save(self, commit=True):
        contact = super().save(commit=False)
        contact.user = self.user

        category_name = self.cleaned_data.get('category_input')
        if category_name:
            category, _created = ContactCategory.objects.get_or_create(
                user=self.user,
                name=category_name
            )
            contact.category = category
        else:
            contact.category = None

        if commit:
            contact.save()

        return contact
