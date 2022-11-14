import * as options from './options.js';
import { OPTS } from './options.js';
export async function parseIcs(content, i, email) {
  const lines = content.split('\r\n');
  const index = [];
  const indexEnd = [];
  let timeZone = '';
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('BEGIN:VEVENT')) {
      index.push(i);
    }
    if (line.includes('END:VEVENT')) {
      indexEnd.push(i);
    }
    if (line.includes('X-WR-TIMEZONE:')) {
      timeZone = line.split(':')[1];
    }
  }
  const strEvents = [];
  for (let i = 0; i < index.length; i++) {
    strEvents.push([...lines].splice(index[i], indexEnd[i] + 1 - index[i]));
  }
  const events = [];
  for (const strEvent of strEvents) {
    const event = getEventInfo(strEvent, timeZone, email);
    if (event) {
      events.push(event);
    }
  }
  events.sort(function (a, b) {
    return a.utcDate - b.utcDate;
  });
  await options.load();
  OPTS.agendas[i].events = events;
  options.write();
}
function getEventInfo(strEvent, timeZone, email) {
  const result = {
    title: '',
    startDate: '',
    endDate: '',
    location: '',
    utcDate: 0,
    url: '',
  };
  let dtSTART = '';
  let dtEnd = '';

  // lines are consolidated as they may be split over multiple lines - when they are split, the line begins with a space
  const consolidatedLines = [];
  for (const line of strEvent) {
    if (line.startsWith(' ')) {
      consolidatedLines[consolidatedLines.length - 1] += line.substring(1);
    } else {
      consolidatedLines.push(line);
    }
  }

  for (const line of consolidatedLines) {
    if (line.includes('SUMMARY')) { result.title = line.split(':')[1]; }
    if (line.includes('DTSTART')) { dtSTART = line.split(':')[1]; }
    if (line.includes('DTEND')) { dtEnd = line.split(':')[1]; }
    if (line.includes('LOCATION')) { result.location = line.split(':')[1]; }
    if (line.includes('UID') && email !== '') {
      const uid = (line.split(':')[1]).split('@')[0];
      const eventUnique = `${uid} ${email.trim()}`;
      result.url = email != null ? `https://calendar.google.com/calendar/u/${email}/r/eventedit/` + btoa(`${eventUnique}`) : '';
    }
    if (line.includes('ATTENDEE')) {
      const details = line.split(';');
      if (details.length > 4 && details[4].split('=')[1] === email) {
        const attendeeDetails = details[3].split('=');
        if (attendeeDetails.length > 1) {
          const attendeeStatus = details[3].split('=')[1];
          result.declined = attendeeStatus === 'DECLINED';
        }
      }
    }
  }

  // add time for all day events
  if (dtSTART.length === 8) { dtSTART += 'T000000Z'; }
  if (dtEnd.length === 8) { dtEnd += 'T235959Z'; }

  // Date parsing
  let year = parseInt(dtSTART.substr(0, 4));
  let month = parseInt(dtSTART.substr(4, 2)) - 1;
  let day = parseInt(dtSTART.substr(6, 2));
  let hour = parseInt(dtSTART.substr(9, 2));
  let min = parseInt(dtSTART.substr(11, 2));
  let sec = parseInt(dtSTART.substr(13, 2));
  const utcDate = Date.UTC(year, month, day, hour, min, sec);
  result.utcDate = utcDate;
  const startDateNumber = new Date(utcDate);
  if (startDateNumber < new Date(Date.now())) { return null; }
  result.startDate = startDateNumber.toLocaleString('en-GB', { timeZone });
  result.title = getDateString(startDateNumber) + result.title;
  year = parseInt(dtEnd.substr(0, 4));
  month = parseInt(dtEnd.substr(4, 2)) - 1;
  day = parseInt(dtEnd.substr(6, 2));
  hour = parseInt(dtEnd.substr(9, 2));
  min = parseInt(dtEnd.substr(11, 2));
  sec = parseInt(dtEnd.substr(13, 2));
  result.endDate = new Date(Date.UTC(year, month, day, hour, min, sec)).toLocaleString('en-GB', { timeZone });

  // Don't return events that have been declined
  if (result.declined) { return null; }

  return result;
}
function getDateString(date) {
  const today = new Date();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = Math.floor((b - a) / (1000 * 60 * 60 * 24));
  if (diff >= 1) {
    return '+' + diff.toString() + ' ';
  }
  if (isNaN(date.getHours())) { return ''; }
  return String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0') + ' ';
}
