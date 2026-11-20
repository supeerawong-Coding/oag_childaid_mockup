import test from 'node:test';
import assert from 'node:assert/strict';
import { realisticSamples, legacyRealisticSamples, migrateRealisticSamples } from '../src/sample-realism.mjs';
import { ageAt, fiscalYear, recordDate } from '../src/domain.mjs';

const baseline = ['consult','case','activity'].flatMap(kind => Array.from({length:9},(_,i)=>({
  id:`${kind}-${i}`,kind,status:'ส่งต่อ',number:`${kind}-${i}/2569`,
  office:'สำนักงานตัวอย่าง',province:'นนทบุรี',
  values:{date:`2026-${String(i+2).padStart(2,'0')}-15`,F05:'2026-02-15T09:00',history:[{date:'2026-02-15',step:'รับเรื่อง'}]},
  children:kind==='activity' ? [] : [{id:`child-${i}`,birth:'2013-06-12',role:'พยาน'}],
})));
test('demo workloads vary by month, statuses, case roles, and participation',()=>{
  const records = realisticSamples(baseline);
  const months = {}, statuses = {}, roles = {};
  records.forEach(r=>{
    const date = recordDate(r);
    assert.ok(date <= '2026-10-02');
    assert.equal(fiscalYear(date),2569);
    assert.equal(r.values.history[0].date,date);
    months[date.slice(0,7)] = (months[date.slice(0,7)] || 0)+1;
    statuses[r.status] = (statuses[r.status] || 0)+1;
    if (r.kind==='consult') {
      const age=ageAt(r.children[0].birth,date);
      assert.equal(r.values.F19,age.years);
      assert.equal(r.values.F20,age.months);
    }
    if (r.kind==='case') roles[r.children[0].role]=(roles[r.children[0].role] || 0)+1;
    if (r.kind==='activity') {
      const total=Array.from({length:9},(_,i)=>r.values['P'+(14+i)]).reduce((a,b)=>a+b,0);
      assert.equal(total,r.values.P13);
      assert.ok(r.values.P11<=r.values.P05);
      assert.ok(r.values.P13<=r.values.P07);
      assert.ok(r.values.P08<r.values.P09); assert.ok(r.values.P09<date);
      assert.equal(r.status,'เสร็จสิ้น');
    } else if (r.status==='เสร็จสิ้น') assert.ok(['ได้รับความช่วยเหลือ','ยุติเรื่อง'].includes(r.values.outcome));
    else assert.equal(r.values.outcome,r.status==='ส่งต่อ' ? 'ส่งต่อแล้ว' : 'อยู่ระหว่างติดตาม');
  });
  assert.deepEqual(Object.values(months).sort((a,b)=>a-b),[1,2,2,2,3,3,4,4,6]);
  assert.deepEqual(statuses,{'เสร็จสิ้น':19,'ส่งต่อ':2,'อยู่ระหว่างดำเนินการ':6});
  assert.deepEqual(roles,{'ผู้เสียหาย':6,'ผู้ต้องหา':2,'พยาน':1});
  assert.equal(new Set(records.filter(r=>r.kind==='activity').map(r=>r.values.P13)).size,9);
});
test('every child distribution is varied and demographic fields agree',()=>{
  const records=realisticSamples(baseline);
  const children=records.flatMap(r=>r.children);
  const counts=key=>children.reduce((a,c)=>{ a[c[key]]=(a[c[key]] || 0)+1;return a; },{});
  assert.deepEqual(counts('disability'),{'ไม่มี':15,'มี':2,'ไม่ทราบ':1});
  assert.deepEqual(counts('education'),{'กำลังศึกษา':12,'หยุดเรียนชั่วคราว':3,'ออกจากระบบการศึกษา':2,'จบการศึกษา':1});
  for (const key of ['level','parents','living','role']) {
    const values=Object.values(counts(key));
    assert.ok(values.length>1);
    assert.ok(new Set(values).size>1,`${key} has an artificial flat distribution`);
  }
  for (const r of records.filter(r=>r.kind!=='activity')) {
    for (const child of r.children) {
      const age=ageAt(child.birth,recordDate(r)).years;
      assert.ok(age>=9 && age<18);
      if (child.level==='ประถมศึกษา') assert.ok(age<=12);
      if (child.level==='มัธยมศึกษาตอนปลาย' || child.level==='ปวช.') assert.ok(age>=15);
      assert.equal(child.disability==='มี',child.disabilityTypes.length>0);
      assert.ok(child.guardians.some(g=>g.id===child.primary));
      assert.ok(child.guardians.every(g=>g.roles.length>0));
      if (child.parents==='อยู่ร่วมกัน') assert.deepEqual(child.living,['พ่อ','แม่']);
      if (child.parents==='บิดาเสียชีวิต') assert.ok(!child.living.includes('พ่อ'));
      if (child.parents==='มารดาเสียชีวิต') assert.ok(!child.living.includes('แม่'));
      if (child.education!=='กำลังศึกษา') assert.ok(child.educationReason);
      if (r.kind==='consult') {
        assert.equal(r.values.F13,child.name); assert.equal(r.values.F18,child.birth);
        assert.equal(r.values.F17,child.sex);
      }
    }
  }
  const activities=records.filter(r=>r.kind==='activity');
  const ratios=activities.map(r=>r.values.P14/r.values.P13);
  assert.ok(new Set(ratios).size>5);
});
test('previous realism version upgrades without overwriting user edits',()=>{
  const old=legacyRealisticSamples(baseline);
  const edited=structuredClone(old[0]);edited.children[0].education='ไม่ทราบ';
  const current=[edited,...old.slice(1)];
  const next=migrateRealisticSamples(current,[baseline]);
  assert.strictEqual(next[0],edited);
  assert.deepEqual(next.slice(1),realisticSamples(baseline).slice(1));
  assert.deepEqual(migrateRealisticSamples(next,[baseline]),next);
});
test('migration preserves edits, additions, deletions and is idempotent',()=>{
  const edited=structuredClone(baseline[1]); edited.children[0].role='ผู้เสียหาย';
  const added={...structuredClone(baseline[0]),id:'custom-1'};
  const current=[baseline[0],edited,added];
  const result=migrateRealisticSamples(current,[baseline]);
  assert.notStrictEqual(result[0],baseline[0]);
  assert.strictEqual(result[1],edited);
  assert.strictEqual(result[2],added);
  assert.equal(result.length,3);
  assert.deepEqual(migrateRealisticSamples(result,[baseline]),result);
  const reordered=Object.fromEntries(Object.entries(baseline[0]).reverse());
  assert.deepEqual(migrateRealisticSamples([reordered],[baseline])[0],result[0]);
});
