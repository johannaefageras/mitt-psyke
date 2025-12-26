from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Profile

class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True, label='E-postadress')

    class Meta:
        model = User
        fields = ('username', 'email', 'password1', 'password2')

    def save(self, commit=True):
        user = super().save(commit=False)
        user.email = self.cleaned_data['email']
        if commit:
            user.save()
        return user

class ProfileForm(forms.ModelForm):
    email = forms.EmailField(required=True, label='E-postadress')
    avatar = forms.ImageField(required=False, label='Profilbild')

    class Meta:
        model = Profile
        fields = ('display_name', 'avatar', 'municipality')
        labels = {
            'display_name': 'Visningsnamn',
            'avatar': 'Profilbild',
            'municipality': 'Kommun/region',
        }
        widgets = {
            'display_name': forms.TextInput(attrs={'placeholder': 'T.ex. Alex'}),
        }
