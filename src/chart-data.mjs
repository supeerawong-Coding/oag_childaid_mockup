export function monthlyCounts(counts, from = '', to = '') {
  const keys = Object.keys(counts).filter(k => /^\d{4}-\d{2}$/.test(k)).sort();
  const start = from.slice(0, 7) || keys[0];
  const end = to.slice(0, 7) || keys[keys.length - 1];
  if (!start || !end || start > end) return {};
  const result = {};
  let [year, month] = start.split('-').map(Number);
  while (`${year}-${String(month).padStart(2, '0')}` <= end) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    result[key] = Number(counts[key] || 0);
    if (++month > 12) { month = 1; year++; }
  }
  return result;
}
export function monthLabel(key) {
  return new Date(key + '-01T12:00:00').toLocaleDateString('th-TH', { month: 'short', year: 'numeric' });
}
export function provinceColor(value, max) {
  if (!value) return '#e5e9ed';
  return value / max <= 1 / 3 ? '#fbd9a4' : value / max <= 2 / 3 ? '#f2ad49' : '#b86b0f';
}
export function dashboardPeriod(filters = {}) {
  const fiscalFrom = filters.year ? `${Number(filters.year) - 544}-10-01` : '';
  const fiscalTo = filters.year ? `${Number(filters.year) - 543}-09-30` : '';
  return {
    from: [filters.from, fiscalFrom].filter(Boolean).sort().slice(-1)[0] || '',
    to: [filters.to, fiscalTo].filter(Boolean).sort()[0] || '',
  };
}
export function monthRange(key, filters = {}) {
  const [year, month] = key.split('-').map(Number);
  const period = dashboardPeriod(filters);
  const from = key + '-01';
  const to = `${key}-${new Date(year, month, 0).getDate()}`;
  return { from: period.from > from ? period.from : from, to: period.to && period.to < to ? period.to : to };
}
