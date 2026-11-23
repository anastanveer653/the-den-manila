import { site } from '../data/site.js';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const fmtHour = (h) => `${h % 12 || 12}${h >= 12 ? 'pm' : 'am'}`;

/** Current weekday and minutes past midnight at the cafe, whatever the visitor's timezone. */
function cafeNow() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: site.timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return { day: DAYS.indexOf(get('weekday')), minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function getStatus() {
  const { day, minutes } = cafeNow();
  const today = site.hours[day];
  const open = today.open * 60;
  const close = today.close * 60;

  if (minutes >= open && minutes < close) {
    const soon = close - minutes <= 60;
    return {
      day,
      state: soon ? 'soon' : 'open',
      label: soon ? `Closes soon · ${fmtHour(today.close)}` : `Open now · until ${fmtHour(today.close)}`,
    };
  }
  if (minutes < open) return { day, state: 'closed', label: `Closed · opens ${fmtHour(today.open)}` };

  const next = site.hours[(day + 1) % 7];
  return { day, state: 'closed', label: `Closed · opens ${fmtHour(next.open)} tomorrow` };
}

export function initHours() {
  const list = document.querySelector('[data-hours]');
  const pills = [...document.querySelectorAll('[data-status]')];

  function render() {
    let status;
    try {
      status = getStatus();
    } catch {
      return; // Intl timezone data unavailable: keep the static fallback markup.
    }

    if (list) {
      // Monday first.
      list.innerHTML = [1, 2, 3, 4, 5, 6, 0]
        .map((d) => {
          const h = site.hours[d];
          return `<li class="${d === status.day ? 'is-today' : ''}"><span>${h.day}</span><span>${fmtHour(h.open)} – ${fmtHour(h.close)}</span></li>`;
        })
        .join('');
    }

    pills.forEach((pill) => {
      pill.hidden = false;
      pill.classList.toggle('is-open', status.state !== 'closed');
      pill.classList.toggle('is-soon', status.state === 'soon');
      pill.querySelector('[data-status-text]').textContent = status.label;
    });
  }

  render();
  setInterval(render, 60_000);
}
