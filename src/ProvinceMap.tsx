import React, { useState } from 'react';
import geography from './data/thailand-provinces.json';
import { provinceColor } from './chart-data.mjs';
const num = (v: number) => v.toLocaleString('th-TH');
const activate = (e: React.KeyboardEvent, action: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } };
const features = geography.features.map(f => {
  const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  const path = (polygons as number[][][][]).map(polygon => polygon.map(ring => ring.map(([lon,lat],i) => `${i ? 'L' : 'M'}${((lon-97)*30).toFixed(2)},${((21-lat)*30).toFixed(2)}`).join(' ')+'Z').join(' ')).join(' ');
  return { name: f.properties.PROV_NAM_T, code: f.properties.PROV_CODE, path };
});

export default function ProvinceMap({counts, onClick}: {counts: Record<string, number>; onClick: (key: string) => void}) {
  const [hover,setHover] = useState('');
  const max = Math.max(1,...features.map(f=>counts[f.name] || 0));
  const known = new Set(features.map(f=>f.name));
  const unmatched = Object.entries(counts).filter(([k])=>!known.has(k));
  const entries = features.map(f=>({...f, value: counts[f.name] || 0})).sort((a,b)=>b.value-a.value || a.name.localeCompare(b.name,'th'));
  return <section className="chart province-map" aria-label="ปริมาณงานแยกจังหวัด"><div className="chart-header"><h3>ปริมาณงานแยกจังหวัด</h3><span>คลิกจังหวัดเพื่อดูรายการ</span></div>
    <div className="map-layout"><div><svg viewBox="0 0 275 480" className="thailand-map" aria-label="แผนที่ประเทศไทยรายจังหวัด">
      {entries.map(f=><path key={f.code} d={f.path} fill={provinceColor(f.value,max)} fillRule="evenodd" stroke="white" strokeWidth="0.5" role="button" tabIndex={0} aria-label={`${f.name}: ${num(f.value)} รายการ`} onClick={()=>onClick(f.name)} onKeyDown={e=>activate(e,()=>onClick(f.name))} onMouseEnter={()=>setHover(`${f.name}: ${num(f.value)} รายการ`)} onMouseLeave={()=>setHover('')} onFocus={()=>setHover(`${f.name}: ${num(f.value)} รายการ`)} onBlur={()=>setHover('')}><title>{f.name}: {num(f.value)} รายการ</title></path>)}
    </svg><p className="chart-tooltip" role="status">{hover || 'ชี้หรือโฟกัสจังหวัดเพื่อดูจำนวนงาน'}</p></div><div><p>จำนวนรายการงานตามจังหวัดที่บันทึก</p><div className="map-scale">{[[0,'ไม่มีรายการ'],[1/3,'น้อย'],[2/3,'ปานกลาง'],[1,'มาก']].map(([v,l])=><span key={l}><i style={{background:provinceColor(Number(v)*max,max)}}/>{l}</span>)}</div><p className="chart-note">ระดับสีเทียบกับจังหวัดที่มีงานมากที่สุด: {num(max === 1 && !Object.values(counts).some(Boolean) ? 0 : max)} รายการ</p><div className="province-list">{entries.map(f=><button key={f.code} onClick={()=>onClick(f.name)}><span>{f.name}</span><b>{num(f.value)}</b></button>)}</div></div></div>
    {!!unmatched.length && <div className="chart-note">ไม่สามารถจับคู่จังหวัด: {unmatched.map(([k,v])=><button key={k} onClick={()=>onClick(k)}>{k} ({num(v)} รายการ) </button>)}</div>}
    <p className="chart-note">ข้อมูลสมมติ • ขอบเขตจังหวัด: <a href="https://gis-portal.disaster.go.th/arcgis/rest/services/MapDX/DPM_TH_Boundary/FeatureServer" target="_blank" rel="noreferrer">กรมป้องกันและบรรเทาสาธารณภัย</a> • สตูลประกอบจากขอบเขต 7 อำเภอ</p>
  </section>;
}
