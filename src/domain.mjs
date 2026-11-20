export const fiscalYear = (date) => {
  const d = new Date(date + "T12:00:00");
  return d.getFullYear() + 543 + (d.getMonth() >= 9 ? 1 : 0);
};
export function ageAt(birth, at) {
  if (!birth || !at || birth > at) return "";
  const b = new Date(birth),
    a = new Date(at);
  let months =
    (a.getFullYear() - b.getFullYear()) * 12 +
    a.getMonth() -
    b.getMonth() -
    (a.getDate() < b.getDate() ? 1 : 0);
  return { years: Math.floor(months / 12), months: months % 12 };
}
export const recordDate = (r) =>
  r.kind === "consult"
    ? (r.values.F05 || "").slice(0, 10)
    : r.kind === "activity"
      ? r.values.P10
      : r.values.date;
export function matches(r, f) {
  const d = recordDate(r);
  const children = r.children || [];
  return (
    (!f.kind || f.kind === r.kind) &&
    (!f.childOnly || r.kind !== "activity") &&
    (!f.year || String(fiscalYear(d)) === f.year) &&
    (!f.from || d >= f.from) &&
    (!f.to || d <= f.to) &&
    (!f.office || r.office === f.office) &&
    (!f.province || r.province === f.province) &&
    (!f.status || r.status === f.status) &&
    (!f.category ||
      (r.kind === "consult"
        ? r.values.F09
        : r.kind === "case"
          ? r.values.caseType
          : r.values.P01) === f.category) &&
    (!f.outcome || r.values.outcome === f.outcome) &&
    (![
      "role",
      "guardianRole",
      "disability",
      "education",
      "level",
      "parents",
      "living",
    ].some((k) => f[k]) ||
      children.some((c) => childMatches(c, f))) &&
    (!f.q ||
      JSON.stringify([r.number, r.values, r.children])
        .toLowerCase()
        .includes(f.q.toLowerCase()))
  );
}
export function childMatches(c, f = {}) {
  return (
    (!f.role || c.role === f.role) &&
    (!f.guardianRole ||
      (c.guardians || []).some((g) =>
        (g.roles?.length ? g.roles : ["ยังไม่ได้บันทึก"]).includes(
          f.guardianRole,
        ),
      )) &&
    ["disability", "education", "level", "parents", "living"].every(
      (k) =>
        !f[k] ||
        (Array.isArray(c[k])
          ? (c[k].length ? c[k] : ["ยังไม่ได้บันทึก"]).includes(f[k])
          : (c[k] || "ยังไม่ได้บันทึก") === f[k]),
    )
  );
}
export function childrenFor(records, f = {}) {
  const map = new Map();
  records.forEach((r) =>
    (r.children || [])
      .filter((c) => childMatches(c, f))
      .forEach((c) => map.set(r.kind + ":" + c.id, c)),
  );
  return [...map.values()];
}
export function csv(rows) {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((v) => '"' + String(v ?? "").replace(/"/g, '""') + '"')
          .join(","),
      )
      .join("\r\n")
  );
}
