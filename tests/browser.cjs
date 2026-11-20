const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");
const modulePath =
  process.env.PLAYWRIGHT_MODULE ||
  path.join(
    require("os").homedir(),
    ".cache",
    "codex-runtimes",
    "codex-primary-runtime",
    "dependencies",
    "node",
    "node_modules",
    "playwright",
  );
const { chromium } = require(modulePath);
const schema = JSON.parse(fs.readFileSync("src/schema.json", "utf8"));
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1366, height: 950 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:5173");
  assert.equal(await page.locator(".stat").count(), 5);
  await page.screenshot({ path: "dashboard-1366.png", fullPage: true });
  const nav = async (name) =>
    page.locator("nav").getByRole("button", { name, exact: true }).click();
  await nav("การให้คำปรึกษาด้านกฎหมายแก่เด็ก");
  await page.getByRole("button", { name: "เพิ่มข้อมูล", exact: true }).click();
  const fillField = async (label, value) => {
    const l = page
      .locator(".form-section .field")
      .filter({
        has: page
          .locator("span")
          .filter({
            hasText: new RegExp(
              "^" + label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?: |$)",
            ),
          }),
      })
      .first();
    const control = l
      .locator("input:not([type=checkbox]),select,textarea")
      .first();
    if (await control.isDisabled()) return;
    if (await control.evaluate((e) => e.tagName === "SELECT")) {
      if (value) await control.selectOption({ label: value });
      else await control.selectOption({ index: 1 });
    } else await control.fill(value || "ข้อมูลทดสอบ");
  };
  for (const f of schema.consult.filter(
    (f) => f.required && !["F10", "F19", "F20"].includes(f.id),
  )) {
    const label = page.locator(`[data-field="${f.id}"]`);
    const control = label
      .locator("input:not([type=checkbox]),select,textarea")
      .first();
    if (await control.isDisabled()) continue;
    const tag = await control.evaluate((e) => e.tagName);
    if (tag === "SELECT") await control.selectOption({ index: 1 });
    else
      await control.fill(
        f.type === "วันที่และเวลา"
          ? "2026-10-01T09:00"
          : f.type === "วันที่"
            ? f.id === "F18"
              ? "2012-01-01"
              : "2026-01-01"
            : f.type.includes("ตัวเลข")
              ? "0"
              : f.id === "F13"
                ? "เด็กทดสอบ"
                : f.id === "F14"
                  ? "ระบบ"
                  : "ตัวอย่าง",
      );
  }
  await fillField("ผู้รับผิดชอบ", "เจ้าหน้าที่ทดสอบ");
  await page
    .getByRole("button", { name: "เพิ่มผู้ปกครอง / ผู้ดูแล", exact: true })
    .click();
  const guardian = page
    .locator("section.form-section")
    .filter({
      has: page.getByRole("heading", { name: "ผู้ปกครอง / ผู้ดูแล คนที่ 1" }),
    });
  await guardian.getByLabel("ครูประจำชั้น", { exact: true }).check();
  assert.equal(
    await guardian.getByText("หน่วยงาน / สถานศึกษา", { exact: true }).count(),
    1,
  );
  await page.getByRole("button", { name: "บันทึกข้อมูล", exact: true }).click();
  assert.equal(await page.locator(".table-card").count(), 1);
  await page.reload();
  await nav("การให้คำปรึกษาด้านกฎหมายแก่เด็ก");
  assert.ok((await page.locator(".table-top").innerText()).includes("10"));
  await page.locator('.row-actions button[title="แก้ไข"]').first().click();
  await fillField("ชื่อ", "เด็กแก้ไข");
  await page.getByRole("button", { name: "บันทึกข้อมูล", exact: true }).click();
  assert.ok((await page.locator("tbody").innerText()).includes("เด็กแก้ไข"));
  await nav("การดำเนินงานชั้นพนักงานอัยการ");
  await page.getByRole("button", { name: "เพิ่มข้อมูล", exact: true }).click();
  await fillField("เลขสารบบ / เลขคดี", "ส.1 ทดสอบ/2570");
  await fillField("วันที่รับเรื่อง", "2026-10-01");
  await fillField("ประเภทคดี", "คดีคุ้มครองเด็ก");
  await fillField("ข้อหา / ประเด็น", "ทดสอบสิทธิเด็ก");
  await fillField("ข้อเท็จจริง", "ข้อมูลทดสอบ");
  await fillField("ชื่อเด็ก", "เด็กคดี");
  await fillField("นามสกุล", "ทดสอบ");
  await fillField("ผู้รับผิดชอบ", "เจ้าหน้าที่ทดสอบ");
  await page
    .getByRole("button", { name: "เพิ่มเด็กที่เกี่ยวข้อง", exact: true })
    .click();
  const second = page.locator(".child-block").nth(1);
  await second.getByLabel("ชื่อเด็ก").fill("เด็กคนที่สอง");
  await second.getByLabel(/นามสกุล/).fill("ทดสอบ");
  await page.getByRole("button", { name: "บันทึกข้อมูล", exact: true }).click();
  assert.equal(await page.locator(".table-card").count(), 1);
  await nav("กิจกรรม");
  await page.getByRole("button", { name: "เพิ่มข้อมูล", exact: true }).click();
  for (const f of schema.activity.filter((f) => f.required)) {
    const label = page.locator(`[data-field="${f.id}"]`);
    const control = label.locator("input,select,textarea").first();
    const tag = await control.evaluate((e) => e.tagName);
    if (tag === "SELECT") await control.selectOption({ index: 1 });
    else
      await control.fill(
        f.type === "วันที่"
          ? "2026-10-01"
          : f.type.includes("ตัวเลข")
            ? "0"
            : "กิจกรรมทดสอบ",
      );
  }
  await fillField("ผู้รับผิดชอบ", "เจ้าหน้าที่ทดสอบ");
  await page.getByRole("button", { name: "บันทึกข้อมูล", exact: true }).click();
  assert.equal(await page.locator(".table-card").count(), 1);
  await nav("รายงาน");
  assert.equal(await page.locator("tbody tr").count(), 30);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV", exact: true }).click();
  await (await download).saveAs("test-report.csv");
  assert.ok(fs.readFileSync("test-report.csv", "utf8").includes("เด็กแก้ไข"));
  await page.emulateMedia({ media: "print" });
  await page.pdf({
    path: "report-preview.pdf",
    format: "A4",
    landscape: true,
    printBackground: true,
  });
  await page.emulateMedia({ media: "screen" });
  await nav("Dashboard ผู้บริหาร");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.screenshot({ path: "dashboard-1920.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  await nav("การให้คำปรึกษาด้านกฎหมายแก่เด็ก");
  await page
    .locator('.row-actions button[title="ดูรายละเอียด"]')
    .first()
    .click();
  await page.screenshot({ path: "consult-form-1920.png", fullPage: true });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: browser CRUD, multi-child/guardian, persistence, complete reports, CSV, PDF, 1366/1920 layouts; no browser errors.",
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});


