export function sampleOfficeIndex(kind, index) {
  const counts = { consult: [5, 3, 1], case: [4, 3, 2], activity: [6, 2, 1] }[kind];
  return index < counts[0] ? 0 : index < counts[0] + counts[1] ? 1 : 2;
}
export function redistributeSamples(records, offices, provinces) {
  return records.map(record => {
    const match = /^(consult|case|activity)-(\d)$/.exec(record.id);
    if (!match || match[1] !== record.kind) return record;
    const index = Number(match[2]);
    const oldIndex = index % 3;
    if (record.office !== offices[oldIndex] || record.province !== provinces[oldIndex]) return record;
    const nextIndex = sampleOfficeIndex(record.kind, index);
    const values = { ...record.values };
    if (record.kind === 'consult') {
      if (values.F03 === offices[oldIndex]) values.F03 = offices[nextIndex];
      if (values.F36 === provinces[oldIndex]) values.F36 = provinces[nextIndex];
    }
    if (record.kind === 'activity' && values.P04 === provinces[oldIndex]) values.P04 = provinces[nextIndex];
    return { ...record, office: offices[nextIndex], province: provinces[nextIndex], values };
  });
}
