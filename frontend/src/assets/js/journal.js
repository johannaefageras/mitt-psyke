(function () {
  const api = window.MittPsykeApi;
  if (!api) return;

  const form = document.querySelector('[data-journal-form]');
  if (!form) return;

  const statusEl = document.querySelector('[data-journal-status]');
  const entriesEl = document.querySelector('[data-journal-entries]');
  const emptyEl = document.querySelector('[data-journal-empty]');
  const countEl = document.querySelector('[data-journal-count]');
  const messageEl = document.querySelector('[data-journal-message]');
  const cancelBtn = document.querySelector('[data-journal-cancel]');
  const resetBtn = document.querySelector('[data-journal-reset]');
  const submitBtn = document.querySelector('[data-journal-submit]');
  const entryIdField = document.querySelector('[data-journal-entry-id]');
  const formTitle = document.querySelector('[data-journal-form-title]');
  const scrollButton = document.querySelector('[data-journal-scroll]');
  const template = document.getElementById('journal-entry-template');
  const modal = document.querySelector('[data-journal-modal]');
  const modalCloseButtons = document.querySelectorAll('[data-journal-modal-close]');
  const modalEditBtn = document.querySelector('[data-modal-edit]');

  const dateInput = document.getElementById('journal-date');
  const tagsInput = document.getElementById('journal-tags');
  const tagsSuggestionsEl = document.querySelector('[data-journal-tags-suggestions]');
  const gratefulInput = document.getElementById('journal-grateful');
  const forwardInput = document.getElementById('journal-forward');
  const affirmationInput = document.getElementById('journal-affirmation');
  const contentInput = document.getElementById('journal-content');
  const sleepHoursInput = document.getElementById('journal-sleep-hours');
  const energyInput = document.getElementById('journal-energy');
  const anxietyInput = document.getElementById('journal-anxiety');

  const moodEmojis = {
    1: '😭',
    2: '😢',
    3: '😞',
    4: '😔',
    5: '😐',
    6: '🙂',
    7: '😊',
    8: '😄',
    9: '😁',
    10: '🤩'
  };

  const moodLabels = {
    1: 'Väldigt dåligt',
    2: 'Dåligt',
    3: 'Ganska dåligt',
    4: 'Lite dåligt',
    5: 'Neutralt',
    6: 'Lite bra',
    7: 'Ganska bra',
    8: 'Bra',
    9: 'Väldigt bra',
    10: 'Fantastiskt'
  };

  let entries = [];
  let userTags = [];
  let currentModalEntry = null;

  if (scrollButton) {
    scrollButton.addEventListener('click', () => {
      const targetId = scrollButton.getAttribute('data-journal-scroll');
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

  function openModal(entry) {
    if (!modal) return;
    currentModalEntry = entry;

    // Populate modal content
    const dateEl = modal.querySelector('[data-modal-date]');
    const createdEl = modal.querySelector('[data-modal-created]');
    const moodSection = modal.querySelector('[data-modal-mood]');
    const moodBadge = modal.querySelector('[data-modal-mood-badge]');
    const trackingSection = modal.querySelector('[data-modal-tracking]');
    const trackingItems = modal.querySelector('[data-modal-tracking-items]');
    const reflectionsSection = modal.querySelector('[data-modal-reflections]');
    const gratefulSection = modal.querySelector('[data-modal-grateful]');
    const gratefulText = modal.querySelector('[data-modal-grateful-text]');
    const forwardSection = modal.querySelector('[data-modal-forward]');
    const forwardText = modal.querySelector('[data-modal-forward-text]');
    const affirmationSection = modal.querySelector('[data-modal-affirmation]');
    const affirmationText = modal.querySelector('[data-modal-affirmation-text]');
    const contentSection = modal.querySelector('[data-modal-content]');
    const contentText = modal.querySelector('[data-modal-content-text]');
    const tagsEl = modal.querySelector('[data-modal-tags]');

    if (dateEl) dateEl.textContent = entry.formattedDate || formatDate(entry.date);
    if (createdEl) createdEl.textContent = `Skapad ${formatDateTime(entry.createdAt)}`;

    // Mood
    if (moodSection && moodBadge) {
      if (entry.mood) {
        moodBadge.textContent = `${moodEmojis[entry.mood] || ''} ${
          moodLabels[entry.mood] || ''
        }`.trim();
        moodSection.hidden = false;
      } else {
        moodSection.hidden = true;
      }
    }

    // Tracking data
    if (trackingSection && trackingItems) {
      trackingItems.innerHTML = '';
      const hasTracking =
        entry.sleepHours != null ||
        entry.sleepQuality != null ||
        entry.energyLevel != null ||
        entry.anxietyLevel != null;

      if (hasTracking) {
        if (entry.sleepHours != null) {
          trackingItems.innerHTML += `
            <dl class="tracking-grid-item">
              <dt>Sömn</dt>
              <dd>${entry.sleepHours} h${
            entry.sleepQuality ? ` (kvalitet: ${entry.sleepQuality}/5)` : ''
          }</dd>
            </dl>`;
        }
        if (entry.energyLevel != null) {
          trackingItems.innerHTML += `
            <dl class="tracking-grid-item">
              <dt>Energi</dt>
              <dd>${entry.energyLevel}/10</dd>
            </dl>`;
        }
        if (entry.anxietyLevel != null) {
          trackingItems.innerHTML += `
            <dl class="tracking-grid-item">
              <dt>Ångest</dt>
              <dd>${entry.anxietyLevel}/10</dd>
            </dl>`;
        }
        trackingSection.hidden = false;
      } else {
        trackingSection.hidden = true;
      }
    }

    // Reflections
    const hasReflections = entry.gratefulFor || entry.lookingForwardTo || entry.affirmation;
    if (reflectionsSection) reflectionsSection.hidden = !hasReflections;

    if (gratefulSection && gratefulText) {
      if (entry.gratefulFor) {
        gratefulText.textContent = entry.gratefulFor;
        gratefulSection.hidden = false;
      } else {
        gratefulSection.hidden = true;
      }
    }

    if (forwardSection && forwardText) {
      if (entry.lookingForwardTo) {
        forwardText.textContent = entry.lookingForwardTo;
        forwardSection.hidden = false;
      } else {
        forwardSection.hidden = true;
      }
    }

    if (affirmationSection && affirmationText) {
      if (entry.affirmation) {
        affirmationText.textContent = entry.affirmation;
        affirmationSection.hidden = false;
      } else {
        affirmationSection.hidden = true;
      }
    }

    // Main content
    if (contentSection && contentText) {
      if (entry.content) {
        contentText.textContent = entry.content;
        contentSection.hidden = false;
      } else {
        contentSection.hidden = true;
      }
    }

    // Tags
    if (tagsEl) {
      tagsEl.innerHTML = '';
      if (entry.tags && entry.tags.length) {
        entry.tags.forEach((tag) => {
          const pill = document.createElement('span');
          pill.className = 'journal-tag';
          pill.textContent = `#${tag}`;
          tagsEl.appendChild(pill);
        });
        tagsEl.hidden = false;
      } else {
        tagsEl.hidden = true;
      }
    }

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    currentModalEntry = null;
  }

  // Modal event listeners
  if (modalCloseButtons) {
    modalCloseButtons.forEach((btn) => {
      btn.addEventListener('click', closeModal);
    });
  }

  if (modalEditBtn) {
    modalEditBtn.addEventListener('click', () => {
      if (currentModalEntry) {
        closeModal();
        populateForm(currentModalEntry);
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) {
      closeModal();
    }
  });

  function setStatus(message, variant, allowHtml) {
    if (!statusEl) return;
    statusEl.classList.remove('info-callout--error', 'info-callout--success');
    if (variant === 'error') statusEl.classList.add('info-callout--error');
    if (variant === 'success') statusEl.classList.add('info-callout--success');

    const paragraph = statusEl.querySelector('p') || statusEl;
    if (allowHtml) {
      paragraph.innerHTML = message;
    } else {
      paragraph.textContent = message;
    }
  }

  function setMessage(message, variant) {
    if (!messageEl) return;
    messageEl.textContent = message || '';
    messageEl.classList.remove('form-hint--error', 'form-hint--success');
    if (variant === 'error') messageEl.classList.add('form-hint--error');
    if (variant === 'success') messageEl.classList.add('form-hint--success');
  }

  function formatDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('sv-SE', {
      dateStyle: 'medium'
    }).format(date);
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

  // Flatpickr instance
  let datePicker = null;

  function initDatePicker() {
    if (!dateInput) {
      console.warn('Flatpickr: dateInput not found');
      return;
    }
    if (typeof flatpickr === 'undefined') {
      console.warn('Flatpickr: library not loaded');
      return;
    }

    // Find the calendar icon that should also trigger the picker
    const dateIcon = document.querySelector('[data-journal-date-icon]');

    datePicker = flatpickr(dateInput, {
      locale: 'sv',
      dateFormat: 'Y-m-d',
      defaultDate: new Date(),
      allowInput: true,
      disableMobile: false,
      // Disable month dropdown to avoid parentheses issue
      monthSelectorType: 'static',
      // Accessibility
      ariaDateFormat: 'j F Y',
      // Use a click on input to open (not just focus)
      clickOpens: true
    });

    // Make the calendar icon also open the picker
    if (dateIcon && datePicker) {
      dateIcon.addEventListener('click', function (e) {
        e.preventDefault();
        datePicker.open();
      });
    }
  }

  function setDefaultDate() {
    if (datePicker) {
      datePicker.setDate(new Date(), false);
    } else if (dateInput && !dateInput.value) {
      dateInput.value = new Date().toISOString().split('T')[0];
    }
  }

  function getCheckedValue(name) {
    const checked = form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
  }

  function buildPayload() {
    const moodValue = parseInt(getCheckedValue('mood'), 10);
    const sleepQualityValue = parseInt(getCheckedValue('sleep_quality'), 10);
    const sleepHoursValue =
      sleepHoursInput && sleepHoursInput.value ? Number(sleepHoursInput.value) : null;
    const energyValue = energyInput && energyInput.value ? Number(energyInput.value) : null;
    const anxietyValue = anxietyInput && anxietyInput.value ? Number(anxietyInput.value) : null;

    return {
      date: dateInput ? dateInput.value : null,
      mood: Number.isNaN(moodValue) ? null : moodValue,
      sleep_hours: Number.isNaN(sleepHoursValue) ? null : sleepHoursValue,
      sleep_quality: Number.isNaN(sleepQualityValue) ? null : sleepQualityValue,
      energy_level: Number.isNaN(energyValue) ? null : energyValue,
      anxiety_level: Number.isNaN(anxietyValue) ? null : anxietyValue,
      grateful_for: gratefulInput ? gratefulInput.value.trim() : '',
      looking_forward_to: forwardInput ? forwardInput.value.trim() : '',
      affirmation: affirmationInput ? affirmationInput.value.trim() : '',
      content: contentInput ? contentInput.value.trim() : '',
      tags: tagsInput ? tagsInput.value.trim() : '',
      is_pinned: form.querySelector('input[name="is_pinned"]')?.checked || false
    };
  }

  function resetForm() {
    form.reset();
    if (entryIdField) entryIdField.value = '';
    if (formTitle) formTitle.textContent = 'Ny anteckning';
    if (submitBtn) {
      submitBtn.innerHTML = `
        <span class="button-icon">
          <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </span>
        Spara inlägg
      `;
    }
    if (cancelBtn) cancelBtn.hidden = true;
    setMessage('');
    setDefaultDate();
  }

  function populateForm(entry) {
    if (!entry) return;
    if (entryIdField) entryIdField.value = entry.id;
    if (formTitle) formTitle.textContent = 'Redigera anteckning';
    if (submitBtn) {
      submitBtn.innerHTML = `
        <span class="button-icon">
          <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </span>
        Spara ändringar
      `;
    }
    if (cancelBtn) cancelBtn.hidden = false;

    if (datePicker && entry.date) {
      datePicker.setDate(entry.date, false);
    } else if (dateInput) {
      dateInput.value = entry.date || '';
    }
    if (sleepHoursInput) sleepHoursInput.value = entry.sleepHours ?? '';
    if (energyInput) energyInput.value = entry.energyLevel ?? '';
    if (anxietyInput) anxietyInput.value = entry.anxietyLevel ?? '';
    if (gratefulInput) gratefulInput.value = entry.gratefulFor || '';
    if (forwardInput) forwardInput.value = entry.lookingForwardTo || '';
    if (affirmationInput) affirmationInput.value = entry.affirmation || '';
    if (contentInput) contentInput.value = entry.content || '';
    if (tagsInput) tagsInput.value = (entry.tags || []).join(', ');

    const moodRadio = form.querySelector(`input[name="mood"][value="${entry.mood}"]`);
    if (moodRadio) moodRadio.checked = true;

    const sleepQualityRadio = form.querySelector(
      `input[name="sleep_quality"][value="${entry.sleepQuality}"]`
    );
    if (sleepQualityRadio) sleepQualityRadio.checked = true;

    const pinnedInput = form.querySelector('input[name="is_pinned"]');
    if (pinnedInput) pinnedInput.checked = !!entry.isPinned;

    setMessage('Redigerar ett befintligt inlägg.', 'success');
  }

  function renderTracking(entry, container) {
    if (!container) return;
    container.innerHTML = '';

    const items = [];
    if (entry.sleepHours !== null && entry.sleepHours !== undefined) {
      items.push(`Sömn: ${entry.sleepHours}h`);
    }
    if (entry.energyLevel !== null && entry.energyLevel !== undefined) {
      items.push(`Energi: ${entry.energyLevel}/10`);
    }
    if (entry.anxietyLevel !== null && entry.anxietyLevel !== undefined) {
      items.push(`Ångest: ${entry.anxietyLevel}/10`);
    }
    if (entry.isPinned) items.push('Fäst');

    if (!items.length) {
      container.hidden = true;
      return;
    }

    container.hidden = false;
    items.forEach((label) => {
      const badge = document.createElement('span');
      badge.className = 'journal-tracking-item';
      badge.textContent = label;
      container.appendChild(badge);
    });
  }

  function renderTags(entry, container) {
    if (!container) return;
    container.innerHTML = '';
    if (!entry.tags || !entry.tags.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    entry.tags.forEach((tag) => {
      const pill = document.createElement('span');
      pill.className = 'journal-tag';
      pill.textContent = `#${tag}`;
      container.appendChild(pill);
    });
  }

  function renderEntries() {
    if (!entriesEl || !template) return;
    entriesEl.innerHTML = '';

    if (!entries.length) {
      if (emptyEl) emptyEl.hidden = false;
      if (countEl) countEl.textContent = '0 inlägg';
      return;
    }

    if (emptyEl) emptyEl.hidden = true;
    if (countEl) countEl.textContent = `${entries.length} inlägg`;

    entries.forEach((entry) => {
      const fragment = template.content.cloneNode(true);
      const card = fragment.querySelector('[data-entry-id]');
      if (!card) return;

      card.dataset.entryId = entry.id;
      const dateEl = fragment.querySelector('[data-entry-date]');
      const createdEl = fragment.querySelector('[data-entry-created]');
      const moodEl = fragment.querySelector('[data-entry-mood]');
      const previewEl = fragment.querySelector('[data-entry-preview]');
      const trackingEl = fragment.querySelector('[data-entry-tracking]');
      const tagsEl = fragment.querySelector('[data-entry-tags]');
      const viewBtn = fragment.querySelector('[data-entry-view]');
      const editBtn = fragment.querySelector('[data-entry-edit]');
      const deleteBtn = fragment.querySelector('[data-entry-delete]');

      if (dateEl) dateEl.textContent = entry.formattedDate || formatDate(entry.date);
      if (createdEl) createdEl.textContent = `Skapad ${formatDateTime(entry.createdAt)}`;

      if (moodEl) {
        if (entry.mood) {
          moodEl.textContent = `${moodEmojis[entry.mood] || ''} ${
            moodLabels[entry.mood] || ''
          }`.trim();
        } else {
          moodEl.textContent = 'Ingen måendelogg';
        }
      }

      if (previewEl) {
        if (entry.content) {
          previewEl.textContent = truncateWords(entry.content, 28);
        } else if (entry.gratefulFor) {
          previewEl.textContent = `Tacksam för: ${truncateWords(entry.gratefulFor, 20)}`;
        } else if (!entry.hasTrackingData) {
          previewEl.textContent = 'Tomt inlägg.';
        } else {
          previewEl.textContent = 'Inlägg utan text.';
        }
      }

      renderTracking(entry, trackingEl);
      renderTags(entry, tagsEl);

      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          openModal(entry);
        });
      }

      if (editBtn) {
        editBtn.addEventListener('click', () => {
          populateForm(entry);
          form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }

      if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
          if (!confirm('Vill du radera det här inlägget?')) return;
          try {
            await api.apiFetch(`/api/v1/journal/entries/${entry.id}/`, { method: 'DELETE' });
            setMessage('Inlägget har raderats.', 'success');
            await loadEntries();
          } catch (error) {
            setMessage(error.message || 'Kunde inte radera inlägget.', 'error');
          }
        });
      }

      entriesEl.appendChild(fragment);
    });
  }

  async function loadEntries() {
    try {
      entries = await api.apiFetch('/api/v1/journal/entries/');
      renderEntries();
      collectUserTags();
      renderTagSuggestions();
    } catch (error) {
      if (error.status === 401) {
        setStatus(
          'Sessionen har gått ut. <a href="/accounts/login/">Logga in igen</a>.',
          'error',
          true
        );
        form.querySelectorAll('input, textarea, select, button').forEach((el) => {
          el.disabled = true;
        });
        return;
      }
      setStatus('Kunde inte hämta dagboken.', 'error');
    }
  }

  function collectUserTags() {
    // Collect all unique tags from entries
    const tagSet = new Set();
    entries.forEach((entry) => {
      if (entry.tags && Array.isArray(entry.tags)) {
        entry.tags.forEach((tag) => tagSet.add(tag));
      }
    });
    userTags = Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'sv'));
  }

  function renderTagSuggestions() {
    if (!tagsSuggestionsEl) return;

    // Clear existing suggestions (except the label)
    const existingButtons = tagsSuggestionsEl.querySelectorAll('.tag-suggestion');
    existingButtons.forEach((btn) => btn.remove());

    if (!userTags.length) {
      tagsSuggestionsEl.hidden = true;
      return;
    }

    tagsSuggestionsEl.hidden = false;

    userTags.forEach((tag) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'tag-suggestion';
      button.textContent = tag;
      button.dataset.tag = tag;
      button.addEventListener('click', () => addTagToInput(tag));
      tagsSuggestionsEl.appendChild(button);
    });
  }

  function addTagToInput(tagName) {
    if (!tagsInput) return;

    const currentValue = tagsInput.value.trim();
    if (currentValue) {
      // Check if tag already exists
      const existingTags = currentValue.split(',').map((t) => t.trim().toLowerCase());
      if (!existingTags.includes(tagName.toLowerCase())) {
        tagsInput.value = currentValue + ', ' + tagName;
      }
    } else {
      tagsInput.value = tagName;
    }
    tagsInput.focus();
  }

  async function init() {
    initDatePicker();
    setDefaultDate();
    try {
      const user = await api.apiFetch('/api/v1/me/');
      setStatus(`Inloggad som ${user.displayName || user.username}.`, 'success');
      await loadEntries();
    } catch (error) {
      if (error.status === 401) {
        setStatus(
          'Du behöver logga in för att använda dagboken. <a href="/accounts/login/">Logga in</a>.',
          'error',
          true
        );
        form.querySelectorAll('input, textarea, select, button').forEach((el) => {
          el.disabled = true;
        });
        return;
      }
      setStatus('Något gick fel när dagboken skulle laddas.', 'error');
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');

    const payload = buildPayload();
    const entryId = entryIdField.value;
    const isEdit = Boolean(entryId);
    const endpoint = isEdit ? `/api/v1/journal/entries/${entryId}/` : '/api/v1/journal/entries/';
    const method = isEdit ? 'PATCH' : 'POST';

    if (submitBtn) submitBtn.disabled = true;

    try {
      await api.apiFetch(endpoint, {
        method,
        body: payload
      });
      setMessage(isEdit ? 'Inlägget uppdaterades.' : 'Inlägget sparades.', 'success');
      resetForm();
      await loadEntries();
    } catch (error) {
      const detail = error.payload?.detail || error.message || 'Kunde inte spara inlägget.';
      setMessage(detail, 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      resetForm();
    });
  }

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      resetForm();
    });
  }

  init();
})();
