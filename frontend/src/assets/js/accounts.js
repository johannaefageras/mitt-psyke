(function () {
  const api = window.MittPsykeApi;
  if (!api) return;

  function setMessage(container, text, variant) {
    if (!container) return;
    container.textContent = text || '';
    container.classList.remove('form-hint--error', 'form-hint--success');
    if (variant === 'error') container.classList.add('form-hint--error');
    if (variant === 'success') container.classList.add('form-hint--success');
  }

  async function handleLogin(form) {
    const messageEl = form.querySelector('[data-auth-message]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(messageEl, '');

      const identifier = form.querySelector('[name="email"]')?.value.trim();
      const password = form.querySelector('[name="password"]')?.value;
      const nextUrl = new URLSearchParams(window.location.search).get('next') || '/accounts/profile/';

      try {
        await api.apiFetch('/api/v1/auth/login/', {
          method: 'POST',
          body: {
            identifier,
            password,
          },
        });
        window.location.href = nextUrl;
      } catch (error) {
        setMessage(messageEl, error.message || 'Kunde inte logga in.', 'error');
      }
    });
  }

  async function handleRegister(form) {
    const messageEl = form.querySelector('[data-auth-message]');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(messageEl, '');

      const username = form.querySelector('[name="username"]')?.value.trim();
      const email = form.querySelector('[name="email"]')?.value.trim();
      const password = form.querySelector('[name="password"]')?.value;
      const passwordConfirm = form.querySelector('[name="password_confirm"]')?.value;
      const nextUrl = new URLSearchParams(window.location.search).get('next') || '/accounts/profile/';

      try {
        await api.apiFetch('/api/v1/auth/register/', {
          method: 'POST',
          body: {
            username,
            email,
            password,
            password_confirm: passwordConfirm,
          },
        });
        window.location.href = nextUrl;
      } catch (error) {
        let detail = error.message || 'Kunde inte skapa konto.';
        const errors = error.payload?.errors;
        if (errors && typeof errors === 'object') {
          const firstKey = Object.keys(errors)[0];
          if (firstKey && errors[firstKey]?.length) {
            detail = errors[firstKey].join(' ');
          }
        }
        setMessage(messageEl, detail, 'error');
      }
    });
  }

  // Icon name mapping for JS (matches .eleventy.js mapping)
  const iconNameMap = {
    'check-bold': 'check-bold',
    'check': 'check',
    'delete': 'delete',
  };

  function createIconHtml(iconName) {
    // Strip symbol- prefix if present
    let name = iconName;
    if (name.startsWith('symbol-')) {
      name = name.slice(7);
    }
    // Apply mapping if exists
    const mpIconName = iconNameMap[name] || name;
    
    return (
      `<span class="icon-swap" aria-hidden="true">` +
      `<i class="mp mpl mp-${mpIconName} icon icon--line" aria-hidden="true"></i>` +
      `<i class="mp mps mp-${mpIconName} icon icon--solid" aria-hidden="true"></i>` +
      `</span>`
    );
  }

  function applyProfile(profile, scope) {
    const name = profile.displayName || profile.username;
    const initial = name ? name.charAt(0).toUpperCase() : '•';
    const avatarUrl = profile.avatarUrl || '';

    const nameEl = scope.querySelector('[data-profile-name]');
    const usernameEl = scope.querySelector('[data-profile-username]');
    const emailEl = scope.querySelector('[data-profile-email]');
    const municipalityEl = scope.querySelector('[data-profile-municipality]');
    const dateEl = scope.querySelector('[data-profile-date]');
    const avatarEls = scope.querySelectorAll('[data-profile-avatar]');
    const statusEl = scope.querySelector('[data-profile-status]');

    if (nameEl) nameEl.textContent = name || '';
    if (usernameEl) usernameEl.textContent = profile.username ? `@${profile.username}` : '';
    if (emailEl) emailEl.textContent = profile.email || '';
    if (municipalityEl) municipalityEl.textContent = profile.municipality || '–';
    if (dateEl) {
      const date = profile.dateJoined ? new Date(profile.dateJoined) : null;
      dateEl.textContent = date && !Number.isNaN(date.getTime())
        ? date.toLocaleDateString('sv-SE', { dateStyle: 'medium' })
        : '';
    }
    avatarEls.forEach((avatarEl) => {
      avatarEl.classList.remove('profile-avatar--image');
      avatarEl.innerHTML = '';

      if (avatarUrl) {
        const img = document.createElement('img');
        img.src = avatarUrl;
        img.alt = '';
        img.loading = 'lazy';
        img.decoding = 'async';
        avatarEl.appendChild(img);
        avatarEl.classList.add('profile-avatar--image');
      } else {
        avatarEl.textContent = initial;
      }
    });

    if (statusEl) {
      const iconName = profile.emailVerified ? 'check-bold' : 'delete';
      const label = profile.emailVerified ? 'Verifierad' : 'Ej verifierad';
      statusEl.innerHTML = createIconHtml(iconName) + label;
      statusEl.classList.toggle('status-badge--success', profile.emailVerified);
      statusEl.classList.toggle('status-badge--warning', !profile.emailVerified);
    }
  }

  async function initProfileView() {
    const scope = document;
    const statusMessage = scope.querySelector('[data-profile-message]');
    const resendButton = scope.querySelector('[data-profile-resend]');

    try {
      const profile = await api.apiFetch('/api/v1/me/');
      applyProfile(profile, scope);
      if (statusMessage) {
        const displayName = profile.displayName || profile.username || 'ditt konto';
        setMessage(statusMessage, `Inloggad som ${displayName}.`, 'success');
      }
      if (resendButton) {
        resendButton.hidden = profile.emailVerified;
        resendButton.addEventListener('click', async (event) => {
          event.preventDefault();
          try {
            const response = await api.apiFetch('/api/v1/auth/resend-verification/', { method: 'POST' });
            setMessage(statusMessage, response.detail || 'Verifieringsmejl skickat.', 'success');
          } catch (error) {
            setMessage(statusMessage, error.message || 'Kunde inte skicka mejl.', 'error');
          }
        });
      }
    } catch (error) {
      if (statusMessage) {
        setMessage(statusMessage, 'Du behöver logga in för att se profilen.', 'error');
      }
    }
  }

  async function initProfileEdit(form) {
    const messageEl = form.querySelector('[data-profile-message]');
    const scope = document;
    const resendButton = scope.querySelector('[data-profile-resend]');

    try {
      const profile = await api.apiFetch('/api/v1/me/');
      applyProfile(profile, scope);

      const displayNameInput = form.querySelector('[name="displayName"]');
      const emailInput = form.querySelector('[name="email"]');
      const municipalitySelect = form.querySelector('[name="municipality"]');

      if (displayNameInput) displayNameInput.value = profile.displayName || '';
      if (emailInput) emailInput.value = profile.email || '';
      if (municipalitySelect) municipalitySelect.value = profile.municipality || '';

      if (resendButton) {
        resendButton.hidden = profile.emailVerified;
        resendButton.addEventListener('click', async (event) => {
          event.preventDefault();
          try {
            const response = await api.apiFetch('/api/v1/auth/resend-verification/', { method: 'POST' });
            setMessage(messageEl, response.detail || 'Verifieringsmejl skickat.', 'success');
          } catch (error) {
            setMessage(messageEl, error.message || 'Kunde inte skicka mejl.', 'error');
          }
        });
      }
    } catch (error) {
      setMessage(messageEl, 'Du behöver logga in för att redigera profilen.', 'error');
      form.querySelectorAll('input, select, button').forEach((el) => {
        el.disabled = true;
      });
      return;
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      setMessage(messageEl, '');

      const displayNameInput = form.querySelector('[name="displayName"]');
      const emailInput = form.querySelector('[name="email"]');
      const municipalitySelect = form.querySelector('[name="municipality"]');
      const avatarInput = form.querySelector('[name="avatar"]');

      const formData = new FormData();
      if (displayNameInput) formData.append('displayName', displayNameInput.value.trim());
      if (emailInput) formData.append('email', emailInput.value.trim());
      if (municipalitySelect) formData.append('municipality', municipalitySelect.value);
      if (avatarInput && avatarInput.files && avatarInput.files[0]) {
        formData.append('avatar', avatarInput.files[0]);
      }

      try {
        await api.apiFetch('/api/v1/me/update/', {
          method: 'POST',
          body: formData,
        });
        setMessage(messageEl, 'Profilen är uppdaterad.', 'success');
      } catch (error) {
        setMessage(messageEl, error.message || 'Kunde inte uppdatera profilen.', 'error');
      }
    });
  }

  const loginForm = document.querySelector('[data-auth-form="login"]');
  if (loginForm) handleLogin(loginForm);

  const registerForm = document.querySelector('[data-auth-form="register"]');
  if (registerForm) handleRegister(registerForm);

  const profileView = document.querySelector('[data-profile-view]');
  if (profileView) initProfileView();

  const profileEditForm = document.querySelector('[data-profile-form="edit"]');
  if (profileEditForm) initProfileEdit(profileEditForm);

  const logoutButton = document.querySelector('[data-auth-logout]');
  if (logoutButton) {
    logoutButton.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await api.apiFetch('/api/v1/auth/logout/', { method: 'POST' });
      } finally {
        window.location.href = '/accounts/login/';
      }
    });
  }
})();
