export interface IcalEvent {
  title: string,
  startDate: string,
  endDate: string,
  location: string,
  utcDate: number,
}

export function parseIcs(content:string): IcalEvent[] {
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

  const strEvents:string[][] = [];

  for (let i = 0; i < index.length; i++) {
    strEvents.push([...lines].splice(index[i], indexEnd[i] + 1 - index[i]));
  }

  const events:IcalEvent[] = [];

  for (const strEvent of strEvents) {
    const event = getEventInfo(strEvent, timeZone);
    if (event) {
      events.push(event);
    }
  }

  events.sort(function (a, b) {
    return b.utcDate - a.utcDate;
  });

  return events;
}


function getEventInfo(strEvent: string[], timeZone: string): IcalEvent | null {
  const result:IcalEvent = {
    title: '',
    startDate: '',
    endDate: '',
    location: '',
    utcDate: 0,
  };

  let dtSTART = '';
  let dtEnd = '';

  for (const line of strEvent) {
    if (line.includes('SUMMARY')) result.title = line.split(':')[1];
    if (line.includes('DTSTART')) dtSTART = line.split(':')[1];
    if (line.includes('DTEND')) dtEnd = line.split(':')[1];
    if (line.includes('LOCATION')) result.location = line.split(':')[1];
  }

  let year = parseInt(dtSTART.substr(0, 4));
  let month = parseInt(dtSTART.substr(4, 2)) - 1;
  let day = parseInt(dtSTART.substr(6, 2));
  let hour = parseInt(dtSTART.substr(9, 2));
  let min = parseInt(dtSTART.substr(11, 2));
  let sec = parseInt(dtSTART.substr(13, 2));

  const utcDate = Date.UTC(year, month, day, hour, min, sec);
  result.utcDate = utcDate;

  const startDateNumber = new Date(utcDate);
  if (startDateNumber < new Date(Date.now())) return null;
  result.startDate = startDateNumber.toLocaleString('en-GB', { timeZone: timeZone });

  year = parseInt(dtEnd.substr(0, 4));
  month = parseInt(dtEnd.substr(4, 2)) - 1;
  day = parseInt(dtEnd.substr(6, 2));
  hour = parseInt(dtEnd.substr(9, 2));
  min = parseInt(dtEnd.substr(11, 2));
  sec = parseInt(dtEnd.substr(13, 2));
  result.endDate = new Date(Date.UTC(year, month, day, hour, min, sec)).toLocaleString('en-GB', { timeZone: timeZone });

  return result;
}
