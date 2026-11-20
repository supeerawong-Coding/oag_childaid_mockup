import test from "node:test";
import assert from "node:assert/strict";
import {
  fiscalYear,
  ageAt,
  matches,
  childrenFor,
  csv,
} from "../src/domain.mjs";
test("Thai fiscal year boundary", () => {
  assert.equal(fiscalYear("2026-09-30"), 2569);
  assert.equal(fiscalYear("2026-10-01"), 2570);
});
test("age at service date and before birthday", () => {
  assert.deepEqual(ageAt("2010-10-02", "2026-10-01"), {
    years: 15,
    months: 11,
  });
  assert.equal(ageAt("2027-01-01", "2026-01-01"), "");
});
test("separate child identities across work types", () => {
  assert.equal(
    childrenFor([
      { kind: "consult", children: [{ id: "1" }] },
      { kind: "consult", children: [{ id: "1" }] },
      { kind: "case", children: [{ id: "1" }] },
    ]).length,
    2,
  );
});
test("filters combine dates, education and multiple living choices", () => {
  const r = {
    kind: "case",
    office: "A",
    province: "B",
    status: "ส่งต่อ",
    values: { date: "2026-10-01" },
    children: [
      { education: "ออกจากระบบการศึกษา", living: ["แม่", "ญาติอื่น"] },
    ],
  };
  assert.ok(
    matches(r, {
      year: "2570",
      education: "ออกจากระบบการศึกษา",
      living: "ญาติอื่น",
    }),
  );
  assert.ok(!matches(r, { to: "2026-09-30" }));
  assert.ok(matches(r, { disability: "ยังไม่ได้บันทึก" }));
});
test("CSV supports Thai, quotes and line breaks", () => {
  assert.equal(csv([["เด็ก", 'a"b', "x\ny"]]), '\uFEFF"เด็ก","a""b","x\ny"');
});
test("child filters apply to the same child and aggregation excludes others", () => {
  const r = {
    kind: "case",
    values: { date: "2026-10-01" },
    children: [
      { id: "1", education: "กำลังศึกษา", living: ["แม่"] },
      { id: "2", education: "ออกจากระบบการศึกษา", living: ["พ่อ"] },
    ],
  };
  assert.ok(!matches(r, { education: "กำลังศึกษา", living: "พ่อ" }));
  assert.equal(childrenFor([r], { education: "กำลังศึกษา" }).length, 1);
});
test("spreadsheet schema includes every source field", async () => {
  const { readFile } = await import("node:fs/promises");
  const s = JSON.parse(
    await readFile(new URL("../src/schema.json", import.meta.url), "utf8"),
  );
  assert.equal(s.consult.length, 53);
  assert.equal(s.activity.length, 23);
  assert.deepEqual(
    s.consult.map((f) => f.id),
    Array.from({ length: 53 }, (_, i) => "F" + String(i + 1).padStart(2, "0")),
  );
  assert.deepEqual(
    s.activity.map((f) => f.id),
    Array.from({ length: 23 }, (_, i) => "P" + String(i + 1).padStart(2, "0")),
  );
});
