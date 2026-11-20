import { ageAt } from './domain.mjs';
import { childScenario, activityShares } from './sample-profiles.mjs';

// Fixed demonstration scenarios: a May outreach peak, quieter July, and
// more unresolved cases near the end of the reporting period.
const dates = {
  consult: ['2026-02-06','2026-03-12','2026-04-04','2026-04-23','2026-05-07','2026-05-19','2026-06-11','2026-08-08','2026-09-24'],
  case: ['2026-01-21','2026-03-18','2026-04-09','2026-05-14','2026-05-27','2026-06-16','2026-07-08','2026-08-20','2026-09-29'],
  activity: ['2026-02-19','2026-04-17','2026-05-08','2026-05-22','2026-06-05','2026-07-17','2026-08-14','2026-08-28','2026-09-18'],
};
const states = {
  consult: ['เสร็จสิ้น','เสร็จสิ้น','เสร็จสิ้น','ส่งต่อ','เสร็จสิ้น','เสร็จสิ้น','อยู่ระหว่างดำเนินการ','อยู่ระหว่างดำเนินการ','อยู่ระหว่างดำเนินการ'],
  case: ['เสร็จสิ้น','เสร็จสิ้น','ส่งต่อ','เสร็จสิ้น','เสร็จสิ้น','อยู่ระหว่างดำเนินการ','เสร็จสิ้น','อยู่ระหว่างดำเนินการ','อยู่ระหว่างดำเนินการ'],
  activity: Array(9).fill('เสร็จสิ้น'),
};
const activities = [
  [42000,38500,85,78], [58000,52900,120,113], [75000,69200,160,154],
  [36000,31800,70,64], [62000,57300,140,132], [28000,25600,60,56],
  [54000,49800,110,104], [68000,63100,150,143], [47000,42900,95,91],
];
const earlierDate = (date, days) => {
  const value = new Date(date+'T12:00:00Z');
  value.setUTCDate(value.getUTCDate()-days);
  return value.toISOString().slice(0,10);
};
export function legacyRealisticSamples(records) {
  return records.map(record => {
    const match = /^(consult|case|activity)-(\d)$/.exec(record.id);
    if (!match || match[1] !== record.kind) return record;
    const i = Number(match[2]);
    if (i >= 9) return record;
    const date = dates[record.kind][i];
    const status = states[record.kind][i];
    const outcome = status === 'เสร็จสิ้น' ? 'ได้รับความช่วยเหลือ' : status === 'ส่งต่อ' ? 'ส่งต่อแล้ว' : 'อยู่ระหว่างติดตาม';
    const values = { ...record.values, date, outcome };
    if (values.history) values.history = values.history.map(step => ({...step, date}));
    if (record.kind === 'consult') {
      values.F05 = date + (i % 2 ? 'T13:30' : 'T09:00');
      values.F06 = i % 2 ? '14:15' : '10:00';
      const age = ageAt(record.children[0]?.birth, date);
      values.F19 = age ? age.years : '';
      values.F20 = age ? age.months : '';
      const topicIndex = [0,1,0,1,0,2,0,1,0][i];
      values.F09 = ['ปัญหากฎหมายอาญา','ปัญหากฎหมายแพ่งและพาณิชย์','ปัญหากฎหมายที่ดิน'][topicIndex];
      values.F10 = ['ชีวิต/ ร่างกาย','ครอบครัว',''][topicIndex];
    }
    if (record.kind === 'case') values.caseType = ['คดีอาญา','คดีอาญา','คดีเยาวชนและครอบครัว','คดีอาญา','คดีคุ้มครองเด็ก','คดีเยาวชนและครอบครัว','คดีอาญา','คดีคุ้มครองเด็ก','คดีอาญา'][i];
    if (record.kind === 'activity') {
      const [budget,spent,target,total] = activities[i];
      Object.assign(values,{P05:budget,P07:target,P08:date,P09:date,P10:date,P11:spent,P13:total,P06: i%3+3,P12:i%3+3});
      const shares = [.31,.37,.02,.10,.12,.01,.03,.04,0];
      let remainder = total;
      shares.forEach((share,j) => {
        const count = j === shares.length-1 ? remainder : Math.floor(total*share);
        values['P'+(14+j)] = count;
        remainder -= count;
      });
    }
    const children = record.kind === 'case' ? record.children.map(child => ({
      ...child, role: ['ผู้เสียหาย','ผู้เสียหาย','ผู้ต้องหา','ผู้เสียหาย','พยาน','ผู้ต้องหา','ผู้เสียหาย','ผู้เสียหาย','ผู้ต้องหา'][i],
    })) : record.children;
    return {...record,status,values,children};
  });
}
export function realisticSamples(records) {
  return legacyRealisticSamples(records).map(record => {
    const match = /^(consult|case|activity)-([0-8])$/.exec(record.id);
    if (!match || match[1] !== record.kind) return record;
    const index = Number(match[2]);
    const values = { ...record.values };
    const children = record.kind === 'activity' ? [] : record.children.map(child => childScenario(child,record,index));
    if ((record.kind === 'consult' && index === 1) || (record.kind === 'case' && index === 6)) values.outcome = 'ยุติเรื่อง';
    if (record.kind === 'consult' && children.length) {
      const child = children[0];
      const age = ageAt(child.birth,values.date);
      Object.assign(values,{F12:child.sex==='หญิง' ? 'เด็กหญิง' : 'เด็กชาย',F13:child.name,F14:child.surname,F17:child.sex,F18:child.birth,F19:age ? age.years : '',F20:age ? age.months : ''});
    }
    if (record.kind === 'activity') {
      const shares = activityShares[index];
      const total = values.P13;
      const counts = shares.map(share=>Math.floor(total*share));
      // Largest remainder allocation avoids placing all rounding into one sex.
      const ranks = shares.map((share,i)=>({i,remainder:total*share-counts[i]})).sort((a,b)=>b.remainder-a.remainder);
      let remaining = total-counts.reduce((a,b)=>a+b,0);
      ranks.forEach(({i})=>{ if (remaining>0) {counts[i]++;remaining--;} });
      counts.forEach((count,i)=>values['P'+(14+i)]=count);
      Object.assign(values,{
        P08:earlierDate(values.P10,14+index),P09:earlierDate(values.P10,5+index%4),
        P02:['สิทธิเด็กและการขอความช่วยเหลือ','กฎหมายครอบครัวสำหรับผู้ปกครอง','ป้องกันความรุนแรงในโรงเรียน','ความปลอดภัยออนไลน์','สิทธิเด็กและกระบวนการยุติธรรม','การเข้าถึงความช่วยเหลือทางกฎหมาย','ป้องกันการกลั่นแกล้ง','รู้สิทธิในสถานศึกษา','การคุ้มครองเด็กในชุมชน'][index],
        P03:['รู้สิทธิ รู้กฎหมายในโรงเรียน','อัยการพบผู้ปกครอง','โรงเรียนปลอดภัย','เยาวชนรู้ทันโลกออนไลน์','อัยการพบเยาวชน','เครือข่ายคุ้มครองเด็กชุมชน','หยุดกลั่นแกล้งในโรงเรียน','เยาวชนรู้สิทธิของตน','ชุมชนร่วมดูแลเด็ก'][index],
        P06:[4,5,6,3,5,3,4,6,4][index],P12:[4,4,6,3,5,2,4,5,4][index],
        partners:['โรงเรียนและองค์กรปกครองส่วนท้องถิ่น','เครือข่ายผู้ปกครองและโรงเรียน','โรงเรียนและหน่วยงานคุ้มครองเด็ก','โรงเรียนและเครือข่ายเยาวชน','สถานศึกษาและนักสังคมสงเคราะห์','องค์กรปกครองส่วนท้องถิ่นและผู้นำชุมชน','โรงเรียนและครูแนะแนว','สถานศึกษาและองค์กรเยาวชน','ผู้นำชุมชนและหน่วยงานคุ้มครองเด็ก'][index],
      });
    }
    return {...record,values,children};
  });
}
const canonical = value => JSON.stringify(value, function (_key, item) {
  return item && typeof item === 'object' && !Array.isArray(item)
    ? Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))) : item;
});
// Upgrade whole untouched demo rows only. Keep edits, added rows, and deletions.
export function migrateRealisticSamples(records, baselines) {
  const candidates = new Map();
  [...baselines.flat(), ...baselines.flatMap(legacyRealisticSamples)].forEach(record => {
    const variants = candidates.get(record.id) || [];
    variants.push(canonical(record));
    candidates.set(record.id,variants);
  });
  return records.map(record => candidates.get(record.id)?.includes(canonical(record))
    ? realisticSamples([record])[0] : record);
}
