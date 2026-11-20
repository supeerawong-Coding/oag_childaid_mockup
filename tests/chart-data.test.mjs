import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { monthlyCounts, monthLabel, provinceColor, dashboardPeriod, monthRange } from '../src/chart-data.mjs';

test('monthly series fills gaps and sorts across calendar years', () => {
  assert.deepEqual(monthlyCounts({'2027-02':3,'2026-12':2}), {'2026-12':2,'2027-01':0,'2027-02':3});
  assert.deepEqual(monthlyCounts({'2026-12':2},'2026-11-15','2027-01-05'), {'2026-11':0,'2026-12':2,'2027-01':0});
  assert.deepEqual(monthlyCounts({}), {});
  assert.deepEqual(monthlyCounts({},'2027-01-01','2026-12-31'), {});
  assert.deepEqual(monthlyCounts({},'2026-10-01','2026-10-31'), {'2026-10':0});
  assert.match(monthLabel('2026-12'), /2569/);
});
test('province colors handle zero and intensity bands', () => {
  assert.equal(provinceColor(0,10),'#e5e9ed');
  assert.notEqual(provinceColor(1,10), provinceColor(10,10));
});
test('fiscal range intersects explicit dates and monthly drill never widens date filters', () => {
  assert.deepEqual(dashboardPeriod({year:'2570'}),{from:'2026-10-01',to:'2027-09-30'});
  assert.deepEqual(dashboardPeriod({year:'2570',from:'2026-09-01',to:'2027-01-20'}),{from:'2026-10-01',to:'2027-01-20'});
  assert.deepEqual(monthRange('2027-01',{from:'2027-01-05',to:'2027-01-20'}),{from:'2027-01-05',to:'2027-01-20'});
  assert.deepEqual(monthRange('2028-02'),{from:'2028-02-01',to:'2028-02-29'});
});
test('boundaries cover 77 unique provinces and demo provinces have geometry', () => {
  const geo = JSON.parse(fs.readFileSync(new URL('../src/data/thailand-provinces.json',import.meta.url),'utf8'));
  assert.equal(geo.features.length,77);
  assert.equal(new Set(geo.features.map(f=>f.properties.PROV_CODE)).size,77);
  assert.equal(new Set(geo.features.map(f=>f.properties.PROV_NAM_T)).size,77);
  for (const name of ['กรุงเทพมหานคร','นนทบุรี','เชียงใหม่','บึงกาฬ','สตูล']) {
    assert.ok(geo.features.find(f=>f.properties.PROV_NAM_T===name)?.geometry.coordinates.length);
  }
});
