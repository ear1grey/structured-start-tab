import * as options from './options.js';
import { OPTS } from './options.js';
export async function parseIcs(content, agenda, email) {
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
    const eventDetailsList = getEventInfo(strEvent, timeZone, email);
    if (eventDetailsList) {
      events.push(...eventDetailsList);
    }
  }
  events.sort(function (a, b) {
    return a.utcDate - b.utcDate;
  });
  await options.load();
  agenda.events = events;
  for (const storedAgenda of OPTS.agendas) {
    if (storedAgenda.agendaId === agenda.agendaId) { storedAgenda.events = events; }
  }
  options.write();
}

// return all the events in the next year or the first 20 events
function getRecurringEvents(recurringEvent) {
  const frequencyDefinition = parseFrequencyArguments(recurringEvent.frequencyRules);
  const events = [];

  const eventDate = new Date(recurringEvent.utcDate);

  // TODO: Add daily, monthly, and yearly recurring events
  if (frequencyDefinition.frequency !== 'WEEKLY') return [];

  // Skip if the end of the recurrence has passed
  if (frequencyDefinition.until && Date.now() > frequencyDefinition.until) return [];

  // Handle weekly recurring events
  const increment = 7 * (frequencyDefinition.interval || 1);

  const eventsCount = frequencyDefinition.count;
  let occurrences = 0;

  for (let day = 0; day < 365; day += increment) {
    const beginningOfWeek = getBeginningOfWeek(addDays(eventDate, day));

    // If the current week is newer than the end of the recurrence, stop
    if (beginningOfWeek > frequencyDefinition.until) break;

    // TODO: Add exception days (event deleted or moved)

    for (const dayOfWeek of frequencyDefinition.byDay) {
      const newEvent = {
        title: recurringEvent.title,
        utcDate: addDays(beginningOfWeek, getDaysToAdd(dayOfWeek)).valueOf(),
        utcDateParsed: addDays(beginningOfWeek, getDaysToAdd(dayOfWeek)), // TODO: Remove once dev complete
        url: recurringEvent.url,
      };

      occurrences++;
      if (eventsCount && occurrences >= eventsCount) return events;

      // If the new event is in the past, skip it
      if (newEvent.utcDate < Date.now()) continue;

      events.push(newEvent);
    }
  }

  return events;
}

function getDaysToAdd(dayOfWeek) {
  const days = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  return days.indexOf(dayOfWeek);
}

const getBeginningOfWeek = (date) => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  return new Date(date.setDate(diff));
};

function parseFrequencyArguments(frequencyRules) {
  const rules = frequencyRules.split(';');

  const frequencyDefinition = {};

  for (const argument of rules) {
    const key = argument.split('=')[0];
    const value = argument.split('=')[1];

    switch (key) {
      case 'FREQ':
        frequencyDefinition.frequency = value;
        break;
      case 'COUNT':
        frequencyDefinition.count = parseInt(value);
        break;
      case 'INTERVAL':
        frequencyDefinition.interval = parseInt(value);
        break;
      case 'BYDAY':
        frequencyDefinition.byDay = value.split(',');
        break;
      case 'UNTIL':
        frequencyDefinition.until = parseDate(value);
        break;
    }
  }

  return frequencyDefinition;
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
    if (line.includes('SUMMARY')) { result.title = line.substring(line.indexOf(':') + 1); }
    if (line.includes('DTSTART')) { dtSTART = getDateDetails(line.substr(7)); }
    if (line.includes('DTEND')) { dtEnd = getDateDetails(line.substr(5)); }
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
    if (line.includes('RRULE')) { result.frequencyRules = line.split(':')[1]; }
  }

  // Don't return events that have been declined
  if (result.declined) { return null; }

  // add time for all day events
  if (dtSTART.date?.length === 8) { dtSTART.date += 'T000000Z'; }
  if (dtEnd.date?.length === 8) { dtEnd.date += 'T235959Z'; }

  // Date parsing
  const utcDate = parseDate(dtSTART.date, dtSTART.timezone);
  result.utcDate = utcDate;
  const startDateNumber = new Date(utcDate);
  if (startDateNumber < new Date(Date.now()) && !result.frequencyRules) { return null; }
  result.startDate = startDateNumber.toLocaleString('en-GB', { timeZone });
  result.endDate = parseDate(dtEnd.date).toLocaleString('en-GB', { timeZone });

  if (result.frequencyRules) {
    const events = getRecurringEvents(result);
    return events;
  }

  return [result];
}

function getDateDetails(dateDefinition) {
  const [additionalInfo, date] = dateDefinition.split(':');

  let timezone = null;
  for (const info of additionalInfo.split(';')) {
    if (info.startsWith('TZID')) {
      timezone = info.split('=')[1];
    }
  }

  return { date, timezone };
}

function parseDate(date, timeZone) {
  const year = parseInt(date.substr(0, 4));
  const month = parseInt(date.substr(4, 2)) - 1;
  const day = parseInt(date.substr(6, 2));
  const hour = parseInt(date.substr(9, 2));
  const min = parseInt(date.substr(11, 2));
  const sec = parseInt(date.substr(13, 2));

  const utcDate = new Date(Date.UTC(year, month, day, hour, min, sec));
  if (timeZone) { utcDate.setMinutes(utcDate.getMinutes() + (getOffset(timeZone, utcDate)) * -1); }
  return utcDate.valueOf();
}

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function getOffset(timeZone, date) {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone }));
  return (tzDate.getTime() - utcDate.getTime()) / 6e4;
}
