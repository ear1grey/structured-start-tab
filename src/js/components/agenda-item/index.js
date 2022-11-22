import { attachStyleSheet } from '../comp-utils.js';
const ONE_DAY = 60 * 60 * 24 * 1000;
function daysBetween(d1, d2, add = 'd') {
  const diffMillis = d2.getTime() - d1.getTime();
  const diffDays = diffMillis / ONE_DAY;
  const diff = Math.abs(Math.ceil(diffDays));
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

    this.shadow = this.attachShadow({ mode: 'closed' });
    attachStyleSheet(this.shadow, 'js/components/agenda-item/index.css');
    this._a.append(time, p);
    this.shadow.append(this._a);
  }

  // COMPONENT ELEMENTS
  get timeElem() { return this.shadow.querySelector('time'); }
  get titleElem() { return this.shadow.querySelector('p'); }
  get hrefElem() { return this.shadow.querySelector('a'); }

  // GETTERS AND SETTERS

  get time() {
    const timeAttr = this.hasAttribute('time') ? Number(this.getAttribute('time')) : 0;
    return isNaN(timeAttr) ? 0 : timeAttr;
  }

  set time(newTime) { this.setAttribute('time', newTime); }

  get href() { return this.getAttribute('href'); }
  set href(newHref) { this.setAttribute('href', newHref); }

  get title() {
    return this.hasAttribute('title') ? this.getAttribute('title') : 'None';
  }

  set title(newTitle) { this.setAttribute('title', newTitle); }

  // LIFECYCLE METHODS
  onLetterChange() {
    this.titleElem.textContent = this.title;
  }

  onTimeChange() {
    const midnightTonight = new Date().setHours(24, 0, 0, 0);
    let dateOfEvent;
    if (this.time === 0) {
      dateOfEvent = new Date();
      dateOfEvent.setHours(0, 0, 0, 0); // midnight just gone
      this.timeElem.textContent = 'today';
    } else {
      dateOfEvent = new Date(this.time);
      if (dateOfEvent.getTime() < midnightTonight) {
        this.timeElem.textContent = `${dateOfEvent.getHours()}:${('' + dateOfEvent.getMinutes()).padStart(2, '0')}`;
      } else {
        this.timeElem.textContent = daysBetween(new Date(midnightTonight), dateOfEvent);
      }
    }
    this.timeElem.id = 'time';
    this.timeElem.dateTime = dateOfEvent.toISOString();
  }

  onHrefChange() {
    this.hrefElem.href = this.href;
  }


  // OBSERVABLE METHODS

  static get observedAttributes() {
    return ['time', 'title', 'href'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!oldValue && !newValue) { return; }

    switch (name) {
      case 'time':
        this.onTimeChange();
        break;
      case 'title':
        this.onLetterChange();
        break;
      case 'href':
        this.onHrefChange();
        break;
      default:
        break;
    }
  }
}
customElements.define('agenda-item', AgendaItem);
