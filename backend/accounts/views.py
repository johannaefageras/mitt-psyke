from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.core.mail import send_mail
from django.conf import settings
from django.urls import reverse
from django.views.decorators.http import require_http_methods

from .forms import CustomUserCreationForm, ProfileForm
from .models import Profile, EmailVerificationToken

def get_profile(user):
    """Get or create a profile for the user."""
    profile, created = Profile.objects.get_or_create(user=user)
    return profile

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            send_verification_email(request, user)
            login(request, user)
            messages.success(request, 'Välkommen! Ett verifieringsmail har skickats till din e-postadress.')
            return redirect('accounts:profile')
    else:
        form = CustomUserCreationForm()
    return render(request, 'accounts/register.html', {'form': form})

def send_verification_email(request, user):
    # Delete any old tokens
    EmailVerificationToken.objects.filter(user=user).delete()
    # Create new token
    token = EmailVerificationToken.objects.create(user=user)
    verification_url = request.build_absolute_uri(
        reverse('accounts:verify_email', args=[token.token])
    )
    send_mail(
        subject='Verifiera din e-postadress - Mitt Psyke',
        message=f'Hej {user.username}!\n\nKlicka på länken nedan för att verifiera din e-postadress:\n\n{verification_url}\n\nLänken är giltig i 24 timmar.\n\nMed vänliga hälsningar,\nMitt Psyke',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=True,
    )

def verify_email(request, token):
    token_obj = get_object_or_404(EmailVerificationToken, token=token)
    if token_obj.is_valid():
        profile = get_profile(token_obj.user)
        profile.email_verified = True
        profile.save()
        token_obj.delete()
        messages.success(request, 'Din e-postadress har verifierats!')
    else:
        messages.error(request, 'Verifieringslänken har gått ut. Begär en ny.')
    return redirect('accounts:profile')

@login_required
def resend_verification(request):
    profile = get_profile(request.user)
    if not profile.email_verified:
        send_verification_email(request, request.user)
        messages.success(request, 'Ett nytt verifieringsmail har skickats.')
    return redirect('accounts:profile')

@login_required
def profile(request):
    profile = get_profile(request.user)
    return render(request, 'accounts/profile.html', {'profile': profile})

@login_required
def profile_edit(request):
    user_profile = get_profile(request.user)

    if request.method == 'POST':
        form = ProfileForm(request.POST, request.FILES, instance=user_profile)
        if form.is_valid():
            new_email = form.cleaned_data['email']

            # Check if email changed
            if new_email != request.user.email:
                request.user.email = new_email
                user_profile.email_verified = False
                send_verification_email(request, request.user)
                messages.info(request, 'Din e-postadress har ändrats. Vänligen verifiera den nya adressen.')

            request.user.save()
            form.save()
            messages.success(request, 'Din profil har uppdaterats!')
            return redirect('accounts:profile')
    else:
        form = ProfileForm(
            instance=user_profile,
            initial={
                'email': request.user.email,
            }
        )
    return render(request, 'accounts/profile_edit.html', {'form': form})


@require_http_methods(["GET", "POST"])
def logout_view(request):
    """Custom logout view that accepts both GET and POST requests."""
    logout(request)
    return redirect('accounts:login')
