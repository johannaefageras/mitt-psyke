/**
 * Opening hours utilities for support lines
 * Calculates if a support line is currently open based on Swedish time
 */

const DAYS_MAP = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6
};

/**
 * Check if a support line is currently open
 * @param {Array} openingHours - Array of opening hour objects
 * @param {Date} [now] - Optional date to check against (defaults to current time)
 * @returns {{ isOpen: boolean, channel: string|null, nextChange: string|null }}
 */
function checkOpenStatus(openingHours, now = new Date()) {
  if (!Array.isArray(openingHours) || openingHours.length === 0) {
    return { isOpen: false, channel: null, nextChange: null, is24h: false };
  }

  // Convert to Stockholm time
  const stockholmTime = new Date(
    now.toLocaleString('en-US', { timeZone: 'Europe/Stockholm' })
  );

  const currentDay = stockholmTime.getDay();
  const currentHour = stockholmTime.getHours();
  const currentMinute = stockholmTime.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

  // Check if it's 24/7
  const is24h = openingHours.some((slot) => {
    const hasAllDays =
      slot.days &&
      slot.days.length === 7 &&
      ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].every((d) =>
        slot.days.includes(d)
      );
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

    // Check if current day matches
    const dayMatches = slot.days.some((day) => DAYS_MAP[day] === currentDay);
    if (!dayMatches) continue;

    // Parse times
    const [openHour, openMin] = slot.open.split(':').map(Number);
    const [closeHour, closeMin] = slot.close.split(':').map(Number);

    const openTimeMinutes = openHour * 60 + openMin;
    let closeTimeMinutes = closeHour * 60 + closeMin;

    // Handle midnight (24:00 or times that wrap)
    if (closeTimeMinutes === 0 || slot.close === '24:00') {
      closeTimeMinutes = 24 * 60;
    }

    // Check if current time is within range
    if (
      currentTimeMinutes >= openTimeMinutes &&
      currentTimeMinutes < closeTimeMinutes
    ) {
      isOpen = true;
      openChannel = slot.channels?.[0] || 'telefon';

      // Calculate closes at time
      const closeHourFormatted = String(closeHour === 24 ? 0 : closeHour).padStart(2, '0');
      const closeMinFormatted = String(closeMin).padStart(2, '0');
      closesAt = `${closeHourFormatted}:${closeMinFormatted}`;
      break;
    }
  }

  // If not open, find next opening time
  let nextOpens = null;
  if (!isOpen) {
    nextOpens = findNextOpeningTime(openingHours, stockholmTime);
  }

  return {
    isOpen,
    channel: openChannel,
    nextChange: isOpen ? closesAt : nextOpens,
    is24h: false
  };
}

/**
 * Find the next opening time
 */
function findNextOpeningTime(openingHours, now) {
  const currentDay = now.getDay();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeMinutes = currentHour * 60 + currentMinute;

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
        daysAway = 7; // Already passed today
      }

      if (
        daysAway < nearestDaysAway ||
        (daysAway === nearestDaysAway && openTimeMinutes < nearestTime)
      ) {
        nearestDaysAway = daysAway;
        nearestTime = openTimeMinutes;
        nearestSlot = { day, open: slot.open };
      }
    }
  }

  if (!nearestSlot) return null;

  const dayNames = {
    sun: 'sön',
    mon: 'mån',
    tue: 'tis',
    wed: 'ons',
    thu: 'tor',
    fri: 'fre',
    sat: 'lör'
  };

  if (nearestDaysAway === 0) {
    return `idag ${nearestSlot.open}`;
  } else if (nearestDaysAway === 1) {
    return `imorgon ${nearestSlot.open}`;
  } else {
    return `${dayNames[nearestSlot.day]} ${nearestSlot.open}`;
  }
}

/**
 * Get a simple status label
 */
function getStatusLabel(status) {
  if (status.is24h) return 'Dygnet runt';
  if (status.isOpen) return 'Öppet nu';
  return 'Stängt';
}

module.exports = {
  checkOpenStatus,
  findNextOpeningTime,
  getStatusLabel,
  DAYS_MAP
};
