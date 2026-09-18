// Calendar days, independent of daylight-saving changes and device UTC offset.
function scheduledOn(med, date) {
  if (date < med.start || (med.end && date > med.end)) return false;
  const day = new Date(date + 'T00:00:00Z');
  if (med.cycle) {
    const elapsed = Math.round((day - new Date(med.start + 'T00:00:00Z')) / 86400000);
    return elapsed % (med.cycle.on + med.cycle.off) < med.cycle.on;
  }
  return med.days.includes(day.getUTCDay());
}
function courseEnd(start, days) { const date=new Date(start+'T00:00:00Z');date.setUTCDate(date.getUTCDate()+days-1);return date.toISOString().slice(0,10); }
if (typeof module !== 'undefined') module.exports = {scheduledOn,courseEnd};
