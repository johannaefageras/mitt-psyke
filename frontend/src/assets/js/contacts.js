(function () {
  const api = window.MittPsykeApi;
  if (!api) return;

  const form = document.querySelector('[data-contact-form]');
  if (!form) return;

  // Form elements
  const contactIdField = document.querySelector('[data-contact-id]');
  const formTitle = document.querySelector('[data-contact-form-title]');
  const messageEl = document.querySelector('[data-contact-message]');
  const submitBtn = document.querySelector('[data-contact-submit]');
  const cancelBtn = document.querySelector('[data-contact-cancel]');
  const resetBtn = document.querySelector('[data-contact-reset]');
  const scrollButton = document.querySelector('[data-contacts-scroll]');

  // Form inputs
  const nameInput = document.getElementById('contact-name');
  const typeSelect = document.getElementById('contact-type');
  const phoneInput = document.getElementById('contact-phone');
  const emailInput = document.getElementById('contact-email');
  const organizationInput = document.getElementById('contact-organization');
  const addressInput = document.getElementById('contact-address');
  const notesInput = document.getElementById('contact-notes');
  const categoryInput = document.getElementById('contact-category');
  const categorySuggestionsEl = document.querySelector('[data-contact-category-suggestions]');

  // List elements
  const cardsEl = document.querySelector('[data-contact-cards]');
  const emptyEl = document.querySelector('[data-contacts-empty]');
  const countEl = document.querySelector('[data-contacts-count]');
  const template = document.getElementById('contact-card-template');

  // Filters
  const searchInput = document.querySelector('[data-contacts-search]');
  const typeFilterSelect = document.querySelector('[data-contacts-filter-type]');
  const categoryFilterSelect = document.querySelector('[data-contacts-filter-category]');

  // State
  let contacts = [];
  let contactTypes = [];
  let userCategories = [];

  // Scroll to form button
  if (scrollButton) {
    scrollButton.addEventListener('click', () => {
      const targetId = scrollButton.getAttribute('data-contacts-scroll');
      const target = targetId ? document.getElementById(targetId) : null;
      const scrollTarget = target || form;
      if (scrollTarget && scrollTarget.scrollIntoView) {
        scrollTarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      if (targetId) {
        history.replaceState(null, '', `#${targetId}`);
      }
    });
  }

  function setMessage(message, variant) {
    if (!messageEl) return;
    messageEl.textContent = message || '';
    messageEl.classList.remove('form-hint--error', 'form-hint--success');
    if (variant === 'error') messageEl.classList.add('form-hint--error');
    if (variant === 'success') messageEl.classList.add('form-hint--success');
  }

  function formatDateTime(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(date);
  }

  function truncateWords(text, limit) {
    if (!text) return '';
    const words = text.trim().split(/\s+/);
    if (words.length <= limit) return text.trim();
    return words.slice(0, limit).join(' ') + '...';
  }

  // Load contact types from API
  async function loadContactTypes() {
    try {
      contactTypes = await api.apiFetch('/api/v1/contacts/types/');
      populateTypeSelects();
    } catch (error) {
      console.error('Could not load contact types:', error);
    }
  }

  function populateTypeSelects() {
    // Form select
    if (typeSelect) {
      typeSelect.innerHTML = '<option value="other">Välj typ...</option>';
      contactTypes.forEach((type) => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        typeSelect.appendChild(option);
      });
    }

    // Filter select
    if (typeFilterSelect) {
      typeFilterSelect.innerHTML = '<option value="">Alla typer</option>';
      contactTypes.forEach((type) => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        typeFilterSelect.appendChild(option);
      });
    }
  }

  function getTypeLabel(typeValue) {
    const type = contactTypes.find((t) => t.value === typeValue);
    return type ? type.label : typeValue;
  }

  // Build payload from form
  function buildPayload() {
    return {
      name: nameInput ? nameInput.value.trim() : '',
      contact_type: typeSelect ? typeSelect.value : 'other',
      phone: phoneInput ? phoneInput.value.trim() : '',
      email: emailInput ? emailInput.value.trim() : '',
      organization: organizationInput ? organizationInput.value.trim() : '',
      address: addressInput ? addressInput.value.trim() : '',
      notes: notesInput ? notesInput.value.trim() : '',
      category: categoryInput ? categoryInput.value.trim() : ''
    };
  }

  function resetForm() {
    form.reset();
    if (contactIdField) contactIdField.value = '';
    if (formTitle) formTitle.textContent = 'Ny kontakt';
    if (cancelBtn) cancelBtn.hidden = true;
    setMessage('');
  }

  function populateForm(contact) {
    if (!contact) return;
    if (contactIdField) contactIdField.value = contact.id;
    if (formTitle) formTitle.textContent = 'Redigera kontakt';
    if (cancelBtn) cancelBtn.hidden = false;

    if (nameInput) nameInput.value = contact.name || '';
    if (typeSelect) typeSelect.value = contact.contactType || 'other';
    if (phoneInput) phoneInput.value = contact.phone || '';
    if (emailInput) emailInput.value = contact.email || '';
    if (organizationInput) organizationInput.value = contact.organization || '';
    if (addressInput) addressInput.value = contact.address || '';
    if (notesInput) notesInput.value = contact.notes || '';
    if (categoryInput) categoryInput.value = contact.category || '';

    setMessage('Redigerar en befintlig kontakt.', 'success');
  }

  // Categories
  function collectUserCategories() {
    const categorySet = new Set();
    contacts.forEach((contact) => {
      if (contact.category) {
        categorySet.add(contact.category);
      }
    });
    userCategories = Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'sv'));
  }

  function renderCategorySuggestions() {
    if (!categorySuggestionsEl) return;

    const existingButtons = categorySuggestionsEl.querySelectorAll('.tag-suggestion');
    existingButtons.forEach((btn) => btn.remove());

    if (!userCategories.length) {
      categorySuggestionsEl.hidden = true;
      return;
    }

    categorySuggestionsEl.hidden = false;

    userCategories.forEach((category) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tag-suggestion';
      button.textContent = category;
      button.dataset.category = category;
      button.addEventListener('click', () => {
        if (categoryInput) {
          categoryInput.value = category;
          categoryInput.focus();
        }
      });
      categorySuggestionsEl.appendChild(button);
    });
  }

  function populateCategoryFilter() {
    if (!categoryFilterSelect) return;
    categoryFilterSelect.innerHTML = '<option value="">Alla kategorier</option>';
    userCategories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      categoryFilterSelect.appendChild(option);
    });
  }

  // Filtering
  function getFilteredContacts() {
    let filtered = [...contacts];

    const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const typeFilter = typeFilterSelect ? typeFilterSelect.value : '';
    const categoryFilter = categoryFilterSelect ? categoryFilterSelect.value : '';

    if (searchQuery) {
      filtered = filtered.filter((contact) => {
        return (
          contact.name.toLowerCase().includes(searchQuery) ||
          (contact.organization && contact.organization.toLowerCase().includes(searchQuery)) ||
          (contact.phone && contact.phone.toLowerCase().includes(searchQuery)) ||
          (contact.email && contact.email.toLowerCase().includes(searchQuery)) ||
          (contact.notes && contact.notes.toLowerCase().includes(searchQuery))
        );
      });
    }

    if (typeFilter) {
      filtered = filtered.filter((contact) => contact.contactType === typeFilter);
    }

    if (categoryFilter) {
      filtered = filtered.filter((contact) => contact.category === categoryFilter);
    }

    return filtered;
  }

  // Render contacts
  function renderContacts() {
    if (!cardsEl || !template) return;
    cardsEl.innerHTML = '';

    const filtered = getFilteredContacts();

    if (!filtered.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (countEl) countEl.textContent = contacts.length ? `0 av ${contacts.length}` : '0 kontakter';
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (countEl) {
      countEl.textContent =
        filtered.length === contacts.length
          ? `${contacts.length} kontakter`
          : `${filtered.length} av ${contacts.length}`;
    }

    filtered.forEach((contact) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('[data-contact-card-id]');
      if (!card) return;

      card.dataset.contactCardId = contact.id;

      // Populate card
      const nameEl = fragment.querySelector('[data-contact-card-name]');
      const typeEl = fragment.querySelector('[data-contact-card-type]');
      const orgEl = fragment.querySelector('[data-contact-card-organization]');
      const phoneRow = fragment.querySelector('[data-contact-card-phone-row]');
      const phoneEl = fragment.querySelector('[data-contact-card-phone]');
      const emailRow = fragment.querySelector('[data-contact-card-email-row]');
      const emailEl = fragment.querySelector('[data-contact-card-email]');
      const addressRow = fragment.querySelector('[data-contact-card-address-row]');
      const addressEl = fragment.querySelector('[data-contact-card-address]');
      const notesEl = fragment.querySelector('[data-contact-card-notes]');
      const categoryEl = fragment.querySelector('[data-contact-card-category]');
      const updatedEl = fragment.querySelector('[data-contact-card-updated]');
      const editBtn = fragment.querySelector('[data-contact-edit]');
      const deleteBtn = fragment.querySelector('[data-contact-delete]');

      if (nameEl) nameEl.textContent = contact.name;
      if (typeEl) {
        typeEl.textContent = contact.contactTypeLabel || getTypeLabel(contact.contactType);
        typeEl.dataset.type = contact.contactType;
      }

      if (orgEl) {
        if (contact.organization) {
          orgEl.textContent = contact.organization;
          orgEl.hidden = false;
        } else {
          orgEl.hidden = true;
        }
      }

      // Phone
      if (phoneRow && phoneEl) {
        if (contact.phone) {
          phoneEl.textContent = contact.phone;
          phoneEl.href = `tel:${contact.phone.replace(/\s/g, '')}`;
          phoneRow.hidden = false;
        } else {
          phoneRow.hidden = true;
        }
      }

      // Email
      if (emailRow && emailEl) {
        if (contact.email) {
          emailEl.textContent = contact.email;
          emailEl.href = `mailto:${contact.email}`;
          emailRow.hidden = false;
        } else {
          emailRow.hidden = true;
        }
      }

      // Address
      if (addressRow && addressEl) {
        if (contact.address) {
          addressEl.textContent = contact.address;
          addressRow.hidden = false;
        } else {
          addressRow.hidden = true;
        }
      }

      // Notes
      if (notesEl) {
        if (contact.notes) {
          notesEl.textContent = truncateWords(contact.notes, 20);
          notesEl.hidden = false;
        } else {
          notesEl.hidden = true;
        }
      }

      // Category
      if (categoryEl) {
        if (contact.category) {
          categoryEl.textContent = contact.category;
          categoryEl.hidden = false;
        } else {
          categoryEl.hidden = true;
        }
      }

      // Updated
      if (updatedEl) {
        updatedEl.textContent = `Uppdaterad ${formatDateTime(contact.updatedAt)}`;
      }

      // Edit button
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          populateForm(contact);
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      // Delete button
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (!confirm(`Vill du radera kontakten "${contact.name}"?`)) return;
          try {
            await api.apiFetch(`/api/v1/contacts/${contact.id}/`, { method: 'DELETE' });
            setMessage('Kontakten har raderats.', 'success');
            await loadContacts();
          } catch (error) {
            setMessage(error.message || 'Kunde inte radera kontakten.', 'error');
          }
        });
      }

      cardsEl.appendChild(fragment);
    });
  }

  async function loadContacts() {
    try {
      contacts = await api.apiFetch('/api/v1/contacts/');
      // Sort by most recently updated first
      contacts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      collectUserCategories();
      renderCategorySuggestions();
      populateCategoryFilter();
      renderContacts();
    } catch (error) {
      if (error.status === 401) {
        setMessage('Sessionen har gått ut. Logga in igen.', 'error');
        form.querySelectorAll('input, textarea, select, button').forEach((el) => {
          el.disabled = true;
        });
        return;
      }
      setMessage('Kunde inte hämta kontakter.', 'error');
    }
  }

  async function init() {
    await loadContactTypes();

    try {
      await api.apiFetch('/api/v1/me/');
      await loadContacts();
    } catch (error) {
      if (error.status === 401) {
        setMessage('Du behöver logga in för att använda kontakter.', 'error');
        form.querySelectorAll('input, textarea, select, button').forEach((el) => {
          el.disabled = true;
        });
        return;
      }
      setMessage('Något gick fel när kontakter skulle laddas.', 'error');
    }
  }

  // Form submit
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');

    const payload = buildPayload();
    const contactId = contactIdField ? contactIdField.value : '';
    const isEdit = Boolean(contactId);
    const endpoint = isEdit ? `/api/v1/contacts/${contactId}/` : '/api/v1/contacts/';
    const method = isEdit ? 'PATCH' : 'POST';

    if (submitBtn) submitBtn.disabled = true;

    try {
      await api.apiFetch(endpoint, {
        method,
        body: payload
      });
      setMessage(isEdit ? 'Kontakten uppdaterades.' : 'Kontakten sparades.', 'success');
      resetForm();
      await loadContacts();
    } catch (error) {
      const detail = error.payload?.detail || error.message || 'Kunde inte spara kontakten.';
      setMessage(detail, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  // Reset button
  if (resetBtn) {
    resetBtn.addEventListener('click', resetForm);
  }

  // Cancel button
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetForm);
  }

  // Filter listeners
  if (searchInput) {
    searchInput.addEventListener('input', renderContacts);
  }
  if (typeFilterSelect) {
    typeFilterSelect.addEventListener('change', renderContacts);
  }
  if (categoryFilterSelect) {
    categoryFilterSelect.addEventListener('change', renderContacts);
  }

  init();
})();
