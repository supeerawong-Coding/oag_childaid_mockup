import React, { useState } from 'react';
import { monthLabel } from './chart-data.mjs';

const num = (v: number) => v.toLocaleString('th-TH');
const colors = ['#d28a25', '#347c95', '#789746', '#a16c9e', '#c56453', '#526bb0', '#85745c'];
type Props = { title: string; counts: Record<string, number>; note?: string; onClick: (key: string) => void; type?: 'bar' | 'line' | 'donut'; unit?: string };
const activate = (e: React.KeyboardEvent, action: () => void) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); action(); } };

export function Chart({ title, counts, note, onClick, type = 'bar', unit = 'รายการ' }: Props) {
  const [hover, setHover] = useState('');
  const entries = Object.entries(counts).filter(([, v]) => Number.isFinite(Number(v)) && Number(v) >= 0).map(([k,v]) => [k, Number(v)] as const).sort((a,b) => type === 'line' ? a[0].localeCompare(b[0]) : b[1]-a[1]);
  const max = Math.max(1, ...entries.map(([,v]) => v));
  const total = entries.reduce((sum,[,v]) => sum+v,0);
  const label = (k: string) => type === 'line' ? monthLabel(k) : k;
  const description = (k: string, v: number) => `${label(k)}: ${num(v)} ${unit}${type === 'donut' ? ` (${(total ? v/total*100 : 0).toFixed(1)}%)` : ''}`;
  const events = (k: string, v: number) => ({ role: 'button', tabIndex: 0, 'aria-label': description(k,v), onClick: () => onClick(k), onKeyDown: (e: React.KeyboardEvent) => activate(e, () => onClick(k)), onMouseEnter: () => setHover(description(k,v)), onMouseLeave: () => setHover(''), onFocus: () => setHover(description(k,v)), onBlur: () => setHover('') });
  let cumulative = 0;
  const x = (i: number) => entries.length === 1 ? 320 : 45+i*550/(entries.length-1);
  const y = (v: number) => 225-v/max*175;
  return <section className={`chart chart-${type}`} aria-label={title}>
    <div className="chart-header"><h3>{title}</h3><span>คลิกเพื่อดูรายการ</span></div>
    {!total ? <div className="empty">ไม่มีข้อมูลตามเงื่อนไข</div> : <>
      {type === 'line' && <div className="line-scroll"><svg viewBox="0 0 640 280" className="line-chart" aria-label={title}>
        {[0,.5,1].map(t => <g key={t}><line x1="45" x2="595" y1={y(max*t)} y2={y(max*t)} className="grid-line"/><text x="38" y={y(max*t)+4} textAnchor="end">{num(Math.round(max*t))}</text></g>)}
        <polyline fill="none" stroke={colors[0]} strokeWidth="3" points={entries.map(([,v],i) => `${x(i)},${y(v)}`).join(' ')}/>
        {entries.map(([k,v],i) => <g key={k}><circle cx={x(i)} cy={y(v)} r="6" fill={colors[0]} {...events(k,v)}><title>{description(k,v)}</title></circle>{(i === 0 || i === entries.length-1 || i % Math.ceil(entries.length/5) === 0) && <text x={x(i)} y="255" textAnchor="middle">{label(k)}</text>}</g>)}
      </svg></div>}
      {type === 'donut' && <div className="donut-layout"><svg viewBox="0 0 220 220" className="donut-chart" aria-label={title}>
        {entries.filter(([,v])=>v>0).map(([k,v],i) => { const fraction = v/total; const offset = cumulative; cumulative+=fraction; return <circle key={k} cx="110" cy="110" r="78" fill="none" stroke={colors[i%colors.length]} strokeWidth="30" pathLength="100" strokeDasharray={`${fraction*100} ${100-fraction*100}`} strokeDashoffset={-offset*100} transform="rotate(-90 110 110)" {...events(k,v)}><title>{description(k,v)}</title></circle>; })}
        <text x="110" y="108" textAnchor="middle" className="donut-total">{num(total)}</text><text x="110" y="133" textAnchor="middle">{unit}</text>
      </svg><div className="chart-legend">{entries.map(([k,v],i)=><button key={k} onClick={()=>onClick(k)} title={description(k,v)}><i style={{background:colors[i%colors.length]}}/><span>{k}</span><b>{num(v)} · {(v/total*100).toFixed(1)}%</b></button>)}</div></div>}
      {type === 'bar' && entries.map(([k,v]) => <button className="bar-row" key={k} onClick={()=>onClick(k)} title={description(k,v)}><span>{k}</span><svg viewBox="0 0 240 14" className="svg-bar" preserveAspectRatio="none" aria-hidden="true"><rect width="240" height="14" rx="3" fill="#f6f0e6"/><rect width={v/max*240} height="14" rx="3" fill={colors[0]}/></svg><b>{num(v)}</b></button>)}
      {type === 'line' && <div className="month-values">{entries.map(([k,v])=><button key={k} onClick={()=>onClick(k)}>{label(k)} <b>{num(v)}</b></button>)}</div>}
    </>}
    {type !== 'bar' && <p className="chart-tooltip" role="status">{hover || `หน่วย: ${unit} • ชี้หรือโฟกัสเพื่อดูค่า`}</p>}
    {note && <p className="chart-note">{note}</p>}
  </section>;
}

const LazyProvinceMap = React.lazy(() => import('./ProvinceMap'));
export function ProvinceMap(props: Pick<Props, 'counts' | 'onClick'>) {
  return <React.Suspense fallback={<section className="chart province-map"><h3>ปริมาณงานแยกจังหวัด</h3><p role="status">กำลังโหลดแผนที่…</p></section>}><LazyProvinceMap {...props}/></React.Suspense>;
}
