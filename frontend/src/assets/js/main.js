// Mitt Psyke – Main JavaScript

document.addEventListener('DOMContentLoaded', () => {
  initAuthNav();
  initMobileNav();
  initThemeToggle();
  initPortalToc();
  initSupportFilters();
  initOpenStatusUpdater();
});

/**
 * Toggle login/profile icon button based on session state.
 */
function initAuthNav() {
  const loginButton = document.querySelector('[data-auth-nav="login"]');
  const profileButton = document.querySelector('[data-auth-nav="profile"]');
  if (!loginButton && !profileButton) return;

  const apiBaseUrl = window.MITTPSYKE_API_BASE_URL || window.location.origin;

  const showLoggedIn = () => {
    if (loginButton) loginButton.hidden = true;
    if (profileButton) profileButton.hidden = false;
  };

  const showLoggedOut = () => {
    if (loginButton) loginButton.hidden = false;
    if (profileButton) profileButton.hidden = true;
  };

  const checkAuth = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/me/`, { credentials: 'include' });
      if (response.ok) {
        showLoggedIn();
        return;
      }
    } catch (error) {
      // Ignore network/auth errors and fall back to logged-out state.
    }
    showLoggedOut();
  };

  checkAuth();
}

/**
 * Mobile navigation toggle
 */
function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  const navList = document.querySelector('.nav-list');
  const nav = document.querySelector('.main-nav');

  if (!toggle || !navList || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = navList.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', isOpen);
    toggle.classList.toggle('is-open', isOpen);
    nav.classList.toggle('is-open', isOpen);
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (
      !e.target.closest('.main-nav') &&
      !e.target.closest('.nav-toggle') &&
      navList.classList.contains('is-open')
    ) {
      navList.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-open');
      nav.classList.remove('is-open');
    }
  });

  // Close menu on escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navList.classList.contains('is-open')) {
      navList.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.classList.remove('is-open');
      nav.classList.remove('is-open');
      toggle.focus();
    }
  });
}

/**
 * Theme toggle (light/dark)
 */
function initThemeToggle() {
  const toggle = document.getElementById('themeToggle');
  if (!toggle) return;

  // Check for saved preference or system preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  toggle.addEventListener('click', () => {
    const root = document.documentElement;
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      return;
    }

    root.classList.add('theme-transition');
    root.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    window.clearTimeout(initThemeToggle._transitionTimeout);
    initThemeToggle._transitionTimeout = window.setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 260);
  });
}

/**
 * Portal table of contents (based on h2 in portal content)
 */
function initPortalToc() {
  const toc = document.getElementById('portalToc');
  const article = document.querySelector('.portal-article');
  const tocCard = document.querySelector('.portal-toc-card');

  if (!toc || !article || !tocCard) return;

  const headings = Array.from(article.querySelectorAll('h2, h3')).filter(
    (heading) => !heading.hasAttribute('data-toc-exclude')
  );
  if (headings.length < 1) return;

  const usedIds = new Set();
  for (const heading of headings) {
    if (!heading.id) {
      heading.id = getUniqueId(slugify(heading.textContent || ''), usedIds);
    } else {
      heading.id = getUniqueId(heading.id, usedIds);
    }
  }

  toc.innerHTML = headings
    .map(
      (heading) =>
        `<li class="portal-toc-item portal-toc-item--${heading.tagName.toLowerCase()}">` +
        `<a href="#${heading.id}">${escapeHtml(heading.textContent || '')}</a>` +
        `</li>`
    )
    .join('');

  tocCard.hidden = false;
}

/**
 * Supportlines search + category filter (Stödlinjer page)
 */
function initSupportFilters() {
  const searchInput =
    document.getElementById('supportSearchInput') || document.getElementById('searchInput');
  const categoryButtons = Array.from(document.querySelectorAll('.category-pill'));
  const cards = Array.from(document.querySelectorAll('.support-card'));
  const resultsInfo = document.getElementById('supportResultsInfo');
  const noResults = document.getElementById('supportNoResults');
  const clearButton = document.getElementById('supportClearTag');

  if (!searchInput || !categoryButtons.length || !cards.length) return;

  let activeCategory = 'all';
  let activeCategoryLabel = 'Alla';

  const normalize = (value) => (value || '').toString().toLowerCase();

  function applyFilter() {
    const query = normalize(searchInput.value);
    let visibleCount = 0;
    for (const card of cards) {
      const cardCat = card.dataset.category || '';
      const cardText = `${card.dataset.name || ''} ${card.dataset.description || ''} ${
        card.dataset.tags || ''
      }`.toLowerCase();

      const catMatch = activeCategory === 'all' || cardCat === activeCategory;
      const textMatch = !query || cardText.includes(query);
      const isVisible = catMatch && textMatch;

      card.hidden = !isVisible;
      if (isVisible) visibleCount += 1;
    }

    if (resultsInfo) {
      const summary = `${visibleCount} av ${cards.length} stödlinjer`;
      const context =
        activeCategory === 'all' ? 'Alla kategorier' : `Kategori: ${activeCategoryLabel}`;
      const queryLabel = query ? `Sökning: "${searchInput.value.trim()}"` : '';
      resultsInfo.textContent = [summary, context, queryLabel].filter(Boolean).join(' · ');
    }

    if (noResults) {
      noResults.hidden = visibleCount !== 0;
    }

    if (clearButton) {
      clearButton.hidden = !query && activeCategory === 'all';
    }
  }

  categoryButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.category || 'all';
      activeCategoryLabel = (btn.querySelector('.pill-label') || btn).textContent.trim();
      categoryButtons.forEach((b) => {
        const isActive = b === btn;
        b.classList.toggle('is-active', isActive);
        b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      });
      applyFilter();
    });
  });

  searchInput.addEventListener('input', applyFilter);

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      searchInput.value = '';
      const allButton = categoryButtons.find((btn) => btn.dataset.category === 'all');
      if (allButton) {
        allButton.click();
      } else {
        activeCategory = 'all';
        activeCategoryLabel = 'Alla';
        applyFilter();
      }
    });
  }

  applyFilter();
}

/**
 * Real-time open status updater
 * Updates the open/closed status of support lines without page reload
 */
function initOpenStatusUpdater() {
  const cards = document.querySelectorAll('.support-card[data-opening-hours]');
  if (!cards.length) return;

  // Update immediately
  updateAllStatuses(cards);

  // Update every minute
  setInterval(() => updateAllStatuses(cards), 60000);

  // Also update when page becomes visible again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateAllStatuses(cards);
    }
  });
}

/**
 * Update status for all cards
 */
function updateAllStatuses(cards) {
  const now = new Date();

  cards.forEach((card) => {
    try {
      const openingHoursStr = card.dataset.openingHours;
      if (!openingHoursStr) return;

      const openingHours = JSON.parse(openingHoursStr);
      if (!Array.isArray(openingHours) || openingHours.length === 0) return;

      const status = checkOpenStatus(openingHours, now);
      updateCardStatus(card, status);
    } catch (e) {
      // Silently fail for invalid data
    }
  });
}

/**
 * Update a single card's status display
 */
function updateCardStatus(card, status) {
  const badgesContainer = card.querySelector('.support-card-badges');
  if (!badgesContainer) return;

  // Find or create the status badge (not the urgent badge)
  let statusBadge = badgesContainer.querySelector('.badge-open, .badge-closed');

  if (status.is24h) {
    if (statusBadge) {
      statusBadge.className = 'badge-open badge-24h';
      statusBadge.setAttribute('aria-label', 'Öppen dygnet runt');
      statusBadge.innerHTML = `
        <span class="status-dot status-dot--open" aria-hidden="true"></span>
        <span class="badge-text">24/7</span>
      `;
    }
  } else if (status.isOpen) {
    if (statusBadge) {
      statusBadge.className = 'badge-open';
      statusBadge.setAttribute(
        'aria-label',
        `Öppen nu${status.nextChange ? ', stänger ' + status.nextChange : ''}`
      );
      statusBadge.innerHTML = `
        <span class="status-dot status-dot--open" aria-hidden="true"></span>
        <span class="badge-text">Öppet</span>
      `;
    }
  } else {
    if (statusBadge) {
      statusBadge.className = 'badge-closed';
      statusBadge.setAttribute(
        'aria-label',
        `Stängt${status.nextChange ? ', öppnar ' + status.nextChange : ''}`
      );
      statusBadge.innerHTML = `
        <span class="status-dot status-dot--closed" aria-hidden="true"></span>
        <span class="badge-text">Stängt</span>
      `;
    }
  }

  // Update the "next change" text
  const nextChangeEl = card.querySelector('.support-next-change');
  if (nextChangeEl && status.nextChange && !status.is24h) {
    nextChangeEl.textContent = status.isOpen
      ? `Stänger ${status.nextChange}`
      : `Öppnar ${status.nextChange}`;
  } else if (nextChangeEl && status.is24h) {
    nextChangeEl.textContent = '';
  }
}

/**
 * Client-side open status checker (mirrors server-side logic)
 */
function checkOpenStatus(openingHours, now) {
  const DAYS_MAP = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
  const DAY_NAMES = { sun: 'sön', mon: 'mån', tue: 'tis', wed: 'ons', thu: 'tor', fri: 'fre', sat: 'lör' };

  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    return { isOpen: false, channel: null, nextChange: null, is24h: false };
  }

  // Convert to Stockholm time
  const stockholmTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' }));
  const currentDay = stockholmTime.getDay();
  const currentHour = stockholmTime.getHours();
  const currentMinute = stockholmTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Check if it's 24/7
  const is24h = openingHours.some((slot) => {
    const hasAllDays =
      slot.days &&
      slot.days.length === 7 &&
      ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].every((d) => slot.days.includes(d));
    const isFullDay =
      (slot.open === '00:00' && slot.close === '24:00') ||
      (slot.open === '00:00' && slot.close === '23:59');
    return hasAllDays && isFullDay;
  });

  if (is24h) {
    return { isOpen: true, channel: 'telefon', nextChange: null, is24h: true };
  }

  // Find matching open slots
  let isOpen = false;
  let openChannel = null;
  let closesAt = null;

  for (const slot of openingHours) {
    if (!slot.days || !slot.open || !slot.close) continue;

    const dayMatches = slot.days.some((day) => DAYS_MAP[day] === currentDay);
    if (!dayMatches) continue;

    const [openHour, openMin] = slot.open.split(':').map(Number);
    const [closeHour, closeMin] = slot.close.split(':').map(Number);

    const openTimeMinutes = openHour * 60 + openMin;
    let closeTimeMinutes = closeHour * 60 + closeMin;

    if (closeTimeMinutes === 0 || slot.close === '24:00') {
      closeTimeMinutes = 24 * 60;
    }

    if (currentTimeMinutes >= openTimeMinutes && currentTimeMinutes < closeTimeMinutes) {
      isOpen = true;
      openChannel = slot.channels?.[0] || 'telefon';
      const closeHourFormatted = String(closeHour === 24 ? 0 : closeHour).padStart(2, '0');
      const closeMinFormatted = String(closeMin).padStart(2, '0');
      closesAt = `${closeHourFormatted}:${closeMinFormatted}`;
      break;
    }
  }

  // Find next opening time if closed
  let nextOpens = null;
  if (!isOpen) {
    let nearestSlot = null;
    let nearestDaysAway = 8;
    let nearestTime = Infinity;

    for (const slot of openingHours) {
      if (!slot.days || !slot.open) continue;

      const [openHour, openMin] = slot.open.split(':').map(Number);
      const openTimeMinutes = openHour * 60 + openMin;

      for (const day of slot.days) {
        const slotDay = DAYS_MAP[day];
        let daysAway = slotDay - currentDay;

        if (daysAway < 0) daysAway += 7;
        if (daysAway === 0 && openTimeMinutes <= currentTimeMinutes) {
          daysAway = 7;
        }

        if (daysAway < nearestDaysAway || (daysAway === nearestDaysAway && openTimeMinutes < nearestTime)) {
          nearestDaysAway = daysAway;
          nearestTime = openTimeMinutes;
          nearestSlot = { day, open: slot.open };
        }
      }
    }

    if (nearestSlot) {
      if (nearestDaysAway === 0) {
        nextOpens = `idag ${nearestSlot.open}`;
      } else if (nearestDaysAway === 1) {
        nextOpens = `imorgon ${nearestSlot.open}`;
      } else {
        nextOpens = `${DAY_NAMES[nearestSlot.day]} ${nearestSlot.open}`;
      }
    }
  }

  return {
    isOpen,
    channel: openChannel,
    nextChange: isOpen ? closesAt : nextOpens,
    is24h: false
  };
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function getUniqueId(baseId, usedIds) {
  const normalized = baseId || 'section';
  let candidate = normalized;
  let i = 2;
  while (usedIds.has(candidate)) {
    candidate = `${normalized}-${i}`;
    i += 1;
  }
  usedIds.add(candidate);
  return candidate;
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
