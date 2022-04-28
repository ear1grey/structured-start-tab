import { attachStyleSheet } from '../comp-utils.js';
const ONE_DAY = 60 * 60 * 24 * 1000;
function daysBetween(d1, d2, add = 'd') {
  const diffMillis = d2.getTime() - d1.getTime();
  const diffDays = diffMillis / ONE_DAY;
  const diff = Math.abs(Math.ceil(diffDays));
  console.log(diffMillis, diffDays, diff);
  return `+${diff}${add}`;
}
/**
 * An <agenda-item> element comprises a time and some text thus:
 *
 *   +-------+-----------------------------------+
 *   | 10:00 | An event description for today    |
 *   +-------+-----------------------------------+
 *
 *   +-------+-----------------------------------+
 *   |   +1d | An event description for tomorrow |
 *   +-------+-----------------------------------+
 *
 * The time portion is inflexible, the text portions can grow and shrink.
 *
 * The time element uses dateTime ot store the actual data of the event,
 * and the text should update itself at midnight to decide whether it's
 * necessary to update the text portion to show the tiem of the event today
 * or the number of days until the event.
 *
 */
export class AgendaItem extends HTMLElement {
  constructor() {
    super();
    this._time = 0;
    this._a = document.createElement('a');
    const time = document.createElement('time');
    const p = document.createElement('p');
    // time
    const t = this.getAttribute('time');
    const tNum = Number(t);
    const midnightTonight = new Date().setHours(24, 0, 0, 0);
    let dateOfEvent;
    if (isNaN(tNum)) {
      dateOfEvent = new Date();
      dateOfEvent.setHours(0, 0, 0, 0); // midnight just gone
      time.textContent = 'today';
    } else {
      dateOfEvent = new Date(Number(t));
      if (dateOfEvent.getTime() < midnightTonight) {
        time.textContent = `${dateOfEvent.getHours()}:${dateOfEvent.getMinutes()}`;
      } else {
        time.textContent = daysBetween(new Date(midnightTonight), dateOfEvent);
      }
    }
    console.log({ dateOfEvent });
    time.id = 'time';
    time.dateTime = dateOfEvent.toISOString();
    // text
    p.textContent = this.getAttribute('title') || 'None';
    // link
    const href = this.getAttribute('href');
    if (href) {
      this.href = href;
    }
    const shadow = this.attachShadow({ mode: 'closed' });
    attachStyleSheet(shadow, 'js/components/agenda-item/index.css');
    this._a.append(time, p);
    shadow.append(this._a);
  }

  set time(num) {
    this._time = num;
  }

  get time() {
    if (isNaN(this._time)) { return 0; }
    return this._time;
  }

  set href(href) {
    this._a.setAttribute('href', href);
  }

  get href() {
    return this._a.href;
  }
}
customElements.define('agenda-item', AgendaItem);
