const fs = require('fs');
const path = require('path');
const { chromium } = require(path.join(require('os').homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const output = path.resolve('presentation-screenshots');
fs.mkdirSync(path.join(output, 'full-pages'), { recursive: true });
fs.mkdirSync(path.join(output, 'presentation-1920x1080'), { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  const inventory = [];
  async function capture(file, title) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, 'full-pages', file + '.png'), fullPage: true });
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    const slides = [];
    const offsets = [0];
    for (let offset = 900; offset < height - 1080; offset += 900) offsets.push(offset);
    if (height > 1080 && offsets[offsets.length - 1] < height - 1080) offsets.push(height - 1080);
    for (const [index, offset] of offsets.entries()) {
      await page.evaluate(y => window.scrollTo(0, y), offset);
      const name = `${file}-${String(index + 1).padStart(2, '0')}.png`;
      await page.screenshot({ path: path.join(output, 'presentation-1920x1080', name) });
      slides.push(name);
    }
    inventory.push({ file, title, slides });
  }
  const nav = async title => {
    await page.locator('nav').getByRole('button', { name: title, exact: true }).click();
    await page.evaluate(() => window.scrollTo(0, 0));
  };
  await capture('01-dashboard', 'Dashboard ผู้บริหาร');
  const work = [
    ['02-consultation', 'การให้คำปรึกษาด้านกฎหมายแก่เด็ก'],
    ['03-prosecution', 'การดำเนินงานชั้นพนักงานอัยการ'],
    ['04-activities', 'กิจกรรม'],
  ];
  for (const [prefix, title] of work) {
    await nav(title);
    await capture(prefix + '-list', title + ' — หน้ารายการ');
    await page.getByRole('button', { name: 'เพิ่มข้อมูล', exact: true }).click();
    await capture(prefix + '-new', title + ' — หน้าเพิ่มข้อมูล');
    await page.getByRole('button', { name: 'กลับหน้ารายการ', exact: true }).click();
    const rowIndex = prefix.includes('consultation') ? 1 : 0;
    await page.locator('.row-actions button[title="แก้ไข"]').nth(rowIndex).click();
    await capture(prefix + '-example', title + ' — ตัวอย่างข้อมูลที่กรอกแล้ว');
  }
  await nav('รายงาน');
  await capture('05-reports', 'รายงาน — สรุปภาพรวม');
  fs.writeFileSync(path.join(output, 'inventory.json'), JSON.stringify(inventory, null, 2));
  fs.writeFileSync(path.join(output, 'README.txt'), 'ภาพหน้าจอ OAG ChildAid สำหรับนำเสนอผู้บริหาร\r\nข้อมูลทั้งหมดเป็นข้อมูลสมมติ\r\n\r\nfull-pages: ภาพเต็มหน้า 11 หน้า\r\npresentation-1920x1080: ภาพแบ่งเป็นช่วงขนาด Full HD สำหรับวางบนสไลด์\r\nเปิด index.html เพื่อดูภาพรวมและเลือกดาวน์โหลดภาพ\r\n\r\n' + inventory.map(x => x.file + ': ' + x.title).join('\r\n'));
  fs.writeFileSync(path.join(output, 'index.html'), `<!doctype html><html lang="th"><meta charset="utf-8"><title>OAG ChildAid — ภาพหน้าจอสำหรับนำเสนอ</title><style>body{font-family:Tahoma,sans-serif;margin:40px;background:#f4f5f7;color:#34495e}h1{font-size:26px}section{background:white;padding:24px;margin:24px 0;border-radius:8px}img{width:100%;border:1px solid #eee;margin-top:15px}a{color:#b87716}summary{cursor:pointer;margin:18px 0} .slides{display:grid;grid-template-columns:1fr 1fr;gap:15px}</style><h1>OAG ChildAid — ภาพหน้าจอสำหรับนำเสนอผู้บริหาร</h1><p>ข้อมูลสมมติ • ภาพ Full HD ขนาด 1920 × 1080 พิกเซล และภาพเต็มหน้า</p>${inventory.map(x => `<section><h2>${x.title}</h2><a href="full-pages/${x.file}.png" download>ดาวน์โหลดภาพเต็มหน้า</a><details><summary>ดูภาพเต็มหน้า</summary><img src="full-pages/${x.file}.png"></details><div class="slides">${x.slides.map((s, i) => `<div><a href="presentation-1920x1080/${s}" download>ดาวน์โหลดภาพช่วงที่ ${i + 1}</a><img src="presentation-1920x1080/${s}"></div>`).join('')}</div></section>`).join('')}</html>`);
  console.log(JSON.stringify({ pages: inventory.length, slides: inventory.reduce((n, x) => n + x.slides.length, 0), errors, output }));
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
