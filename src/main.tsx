import React, { useState, useEffect } from "react";
import { realisticSamples, migrateRealisticSamples } from "./sample-realism.mjs";
import { sampleOfficeIndex, redistributeSamples } from "./sample-distribution.mjs";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  Users,
  Scale,
  CalendarDays,
  FileBarChart2,
  ChevronDown,
  ChevronRight,
  Search,
  Plus,
  RotateCcw,
  Eye,
  Pencil,
  ArrowLeft,
  Check,
  Download,
  Printer,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";
import schema from "./schema.json";
import {
  fiscalYear,
  ageAt,
  recordDate,
  matches,
  childrenFor,
  csv,
} from "./domain.mjs";
import "./style.css";
import { Chart, ProvinceMap } from "./Charts";
import { monthlyCounts, dashboardPeriod, monthRange } from "./chart-data.mjs";
type Kind = "consult" | "case" | "activity";
type Values = Record<string, any>;
type Child = Values & { id: string; guardians: Values[] };
type RecordItem = {
  id: string;
  kind: Kind;
  number: string;
  office: string;
  province: string;
  status: string;
  values: Values;
  children: Child[];
};
type Field = {
  id: string;
  label: string;
  group?: string;
  type?: string;
  required?: boolean;
  max?: number;
  options?: string[];
};
const names = {
  consult: "การให้คำปรึกษาด้านกฎหมายแก่เด็ก",
  case: "การดำเนินงานชั้นพนักงานอัยการ",
  activity: "กิจกรรม",
  dashboard: "Dashboard ผู้บริหาร",
  reports: "รายงาน",
};
const offices = [
  "สำนักงานอัยการสูงสุด",
  "สำนักงานอัยการจังหวัดนนทบุรี",
  "สำนักงานอัยการจังหวัดเชียงใหม่",
];
const provinces = ["กรุงเทพมหานคร", "นนทบุรี", "เชียงใหม่"];
const statuses = ["ร่าง", "อยู่ระหว่างดำเนินการ", "ส่งต่อ", "เสร็จสิ้น"];
const opts = {
  disability: ["ไม่มี", "มี", "ไม่ทราบ"],
  disabilityTypes: [
    "การมองเห็น",
    "การได้ยิน",
    "การสื่อสาร",
    "การเคลื่อนไหวหรือร่างกาย",
    "อื่น ๆ",
  ],
  education: [
    "กำลังศึกษา",
    "จบการศึกษา",
    "หยุดเรียนชั่วคราว",
    "ออกจากระบบการศึกษา",
    "ไม่เคยเข้าศึกษา",
    "ไม่ทราบ",
  ],
  level: [
    "ก่อนประถมศึกษา",
    "ประถมศึกษา",
    "มัธยมศึกษาตอนต้น",
    "มัธยมศึกษาตอนปลาย",
    "ปวช.",
    "ปวส.",
    "อุดมศึกษา",
    "ไม่ทราบ",
  ],
  parents: [
    "อยู่ร่วมกัน",
    "แยกกันอยู่",
    "หย่าร้าง",
    "บิดาเสียชีวิต",
    "มารดาเสียชีวิต",
    "ทั้งสองเสียชีวิต",
    "ไม่ทราบ",
    "อื่น ๆ",
  ],
  living: [
    "พ่อ",
    "แม่",
    "ปู่/ย่า",
    "ตา/ยาย",
    "ญาติอื่น",
    "ครอบครัวอุปถัมภ์",
    "สถานสงเคราะห์/สถานดูแล",
    "บุคคลอื่น",
    "อยู่ลำพัง",
    "ไม่ทราบ",
  ],
  relation: [
    "พ่อ",
    "แม่",
    "ปู่/ย่า",
    "ตา/ยาย",
    "พี่/น้อง",
    "ลุง/ป้า/น้า/อา",
    "ญาติอื่น",
    "บุคคลที่ไม่มีความสัมพันธ์ทางเครือญาติ",
    "ไม่ทราบ",
  ],
  guardianRoles: [
    "ผู้ปกครองตามกฎหมาย",
    "ผู้ดูแลหลัก",
    "ผู้ดูแลชั่วคราว",
    "ครูประจำชั้น",
    "ครูแนะแนว",
    "ผู้ดูแลสถานสงเคราะห์",
    "นักสังคมสงเคราะห์",
    "ครอบครัวอุปถัมภ์",
    "อื่น ๆ",
  ],
  role: ["ผู้เสียหาย", "ผู้ต้องหา", "พยาน"],
};
const id = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const blankChild = (): Child => ({
  id: id(),
  guardians: [],
  name: "",
  surname: "",
  living: [],
  disabilityTypes: [],
});
const caseFields: Field[] = [
  { id: "caseNumber", label: "เลขสารบบ / เลขคดี", required: true },
  { id: "date", label: "วันที่รับเรื่อง", type: "วันที่", required: true },
  {
    id: "caseType",
    label: "ประเภทคดี",
    options: ["คดีอาญา", "คดีเยาวชนและครอบครัว", "คดีคุ้มครองเด็ก"],
    required: true,
  },
  { id: "charge", label: "ข้อหา / ประเด็น", required: true },
  {
    id: "facts",
    label: "ข้อเท็จจริง",
    type: "ข้อความหลายบรรทัด",
    required: true,
  },
  { id: "decision", label: "คำสั่ง / ผลพิจารณา", type: "ข้อความหลายบรรทัด" },
  { id: "measures", label: "มาตรการช่วยเหลือ", type: "ข้อความหลายบรรทัด" },
  { id: "referral", label: "หน่วยงานส่งต่อ" },
  { id: "appointment", label: "นัดหมายถัดไป", type: "วันที่" },
  { id: "followup", label: "ผลติดตาม", type: "ข้อความหลายบรรทัด" },
];
const commonFields: Field[] = [
  { id: "owner", label: "ผู้รับผิดชอบ", required: true },
  {
    id: "urgency",
    label: "ระดับความเร่งด่วน",
    options: ["ปกติ", "เร่งด่วน", "เร่งด่วนมาก"],
  },
  {
    id: "help",
    label: "ความช่วยเหลือที่ได้รับ",
    options: [
      "ให้คำปรึกษา",
      "คุ้มครองสิทธิ",
      "ส่งต่อหน่วยงาน",
      "สนับสนุนการศึกษา",
      "อื่น ๆ",
    ],
  },
  {
    id: "outcome",
    label: "ผลการช่วยเหลือ",
    options: [
      "อยู่ระหว่างติดตาม",
      "ได้รับความช่วยเหลือ",
      "ส่งต่อแล้ว",
      "ยุติเรื่อง",
    ],
  },
  {
    id: "followupNote",
    label: "รายละเอียดการติดตาม",
    type: "ข้อความหลายบรรทัด",
  },
];
const activityExtra: Field[] = [
  { id: "partners", label: "หน่วยงานร่วม" },
  { id: "objective", label: "วัตถุประสงค์", type: "ข้อความหลายบรรทัด" },
  { id: "indicator", label: "ตัวชี้วัด" },
  { id: "target", label: "เป้าหมายตัวชี้วัด" },
  { id: "achievement", label: "ผลสำเร็จ" },
  { id: "problems", label: "ปัญหา", type: "ข้อความหลายบรรทัด" },
  { id: "recommendation", label: "ข้อเสนอแนะ", type: "ข้อความหลายบรรทัด" },
];
function baselineSeed(distributed = true): RecordItem[] {
  return (["consult", "case", "activity"] as Kind[]).flatMap((kind) =>
    Array.from({ length: 9 }, (_, i) => {
      const officeIndex = distributed ? sampleOfficeIndex(kind, i) : i % 3;
      const date = `2026-${String(i + 2).padStart(2, "0")}-15`;
      const child = {
        ...blankChild(),
        id: `${kind}-child-${i}`,
        name: ["ต้นกล้า", "ฟ้าใส", "พอเพียง", "ใบบัว"][i % 4],
        surname: "ตัวอย่าง",
        birth: `201${i % 4}-06-12`,
        role: opts.role[i % 3],
        disability: opts.disability[i % 3],
        disabilityTypes: i % 3 === 1 ? ["การได้ยิน", "การสื่อสาร"] : [],
        education: opts.education[i % 6],
        level: opts.level[i % 4],
        parents: opts.parents[i % 7],
        living: [opts.living[i % 6]],
        guardians: [
          {
            id: `g-${kind}-${i}`,
            name: "ผู้ดูแล",
            surname: "ตัวอย่าง",
            relation: i % 2 ? "บุคคลที่ไม่มีความสัมพันธ์ทางเครือญาติ" : "แม่",
            roles:
              i % 2 ? ["ครูประจำชั้น", "ผู้ดูแลหลัก"] : ["ผู้ปกครองตามกฎหมาย"],
            phone: "0800000000",
            agency: "โรงเรียนตัวอย่าง",
          },
        ],
        primary: `g-${kind}-${i}`,
      };
      const values: Values = {
        owner: "เจ้าหน้าที่ตัวอย่าง",
        urgency: i % 3 ? "ปกติ" : "เร่งด่วน",
        outcome: ["อยู่ระหว่างติดตาม", "ได้รับความช่วยเหลือ", "ส่งต่อแล้ว"][
          i % 3
        ],
        help: "คุ้มครองสิทธิ",
        F01: `CA-${i + 1}/2569`,
        F03: offices[officeIndex],
        F04: "เจ้าหน้าที่ตัวอย่าง",
        F05: date + "T09:00",
        F06: "10:00",
        F07: "ติดต่อด้วยตนเอง",
        F08: "ผู้ใหญ่บ้าน",
        F09: [
          "ปัญหากฎหมายอาญา",
          "ปัญหากฎหมายแพ่งและพาณิชย์",
          "ปัญหากฎหมายที่ดิน",
        ][i % 3],
        F10: ["ชีวิต/ ร่างกาย", "ครอบครัว", ""][i % 3],
        F11: "บุคคลธรรมดา",
        F12: "เด็กชาย",
        F13: child.name,
        F14: child.surname,
        F15: "บัตรประชาชน",
        F17: "ชาย",
        F18: child.birth,
        F21: "ไทย",
        F22: "ไทย",
        F23: provinces[officeIndex],
        F24: "อำเภอตัวอย่าง",
        F25: "2023-01-01",
        F26: "2030-01-01",
        F31: "99",
        F35: "10000",
        F36: provinces[officeIndex],
        F37: "อำเภอตัวอย่าง",
        F38: "ตำบลตัวอย่าง",
        F40: "0800000000",
        F44: 0,
        F45: "ข้อมูลสมมติสำหรับการสาธิตการช่วยเหลือเด็ก",
        F46: "ให้คำแนะนำและประสานหน่วยงานที่เกี่ยวข้อง",
        F47: "เจ้าหน้าที่ตัวอย่าง",
        caseNumber: `ส.1 ${101 + i}/2569`,
        date,
        caseType: ["คดีอาญา", "คดีเยาวชนและครอบครัว", "คดีคุ้มครองเด็ก"][i % 3],
        charge: "การคุ้มครองสิทธิเด็ก",
        facts: "ข้อมูลสมมติสำหรับสาธิต",
        history: [
          { date, step: "รับเรื่อง", detail: "ตรวจสอบข้อมูลเบื้องต้น" },
        ],
        P01: "เผยแพร่ความรู้ทางกฎหมาย",
        P02: "สิทธิเด็ก",
        P03: ["โครงการรู้สิทธิ รู้กฎหมาย", "อัยการพบเยาวชน", "โรงเรียนปลอดภัย"][
          i % 3
        ],
        P04: provinces[officeIndex],
        P05: 50000 + i * 1000,
        P06: 5,
        P07: 100,
        P08: date,
        P09: date,
        P10: date,
        P11: 40000 + i * 1000,
        P12: 4,
        P13: 90,
        P14: 30,
        P15: 30,
        P16: 0,
        P17: 10,
        P18: 10,
        P19: 0,
        P20: 5,
        P21: 5,
        P22: 0,
        P23: "จัดกิจกรรมให้ความรู้และให้คำปรึกษาแก่เยาวชน",
        partners: "โรงเรียนและองค์กรปกครองส่วนท้องถิ่น",
      };
      if (kind !== "consult")
        Object.keys(values)
          .filter((k) => /^F\d+$/.test(k))
          .forEach((k) => delete values[k]);
      if (kind !== "activity")
        Object.keys(values)
          .filter((k) => /^P\d+$/.test(k))
          .forEach((k) => delete values[k]);
      const age = ageAt(child.birth, date);
      if (kind === "consult") {
        values.F19 = age ? age.years : "";
        values.F20 = age ? age.months : "";
      }
      return {
        id: `${kind}-${i}`,
        kind,
        number: `${kind === "consult" ? "CA" : kind === "case" ? "PR" : "AC"}-${String(i + 1).padStart(4, "0")}/2569`,
        office: offices[officeIndex],
        province: provinces[officeIndex],
        status: statuses[(i % 3) + 1],
        values,
        children: kind === "activity" ? [] : [child],
      };
    }),
  );
}
function seed(): RecordItem[] {
  return realisticSamples(baselineSeed()) as RecordItem[];
}
function load() {
  try {
    const saved = localStorage.getItem("oag-childaid-v1");
    if (!saved) return seed();
    const current = JSON.parse(saved);
    const next = migrateRealisticSamples(current, [baselineSeed(), redistributeSamples(baselineSeed(false), offices, provinces)]) as RecordItem[];
    if (next.some((record, index) => record !== current[index])) {
      try { localStorage.setItem("oag-childaid-v1", JSON.stringify(next)); } catch { /* Keep migrated data in memory. */ }
    }
    return next;
  } catch {
    return seed();
  }
}
const fmt = (date: string) =>
  date
    ? new Date(date.slice(0, 10) + "T12:00:00").toLocaleDateString("th-TH", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
const num = (v: any) => Number(v || 0).toLocaleString("th-TH");
function FieldInput({
  field,
  value,
  onChange,
  disabled = false,
  error,
}: {
  field: Field;
  value: any;
  onChange: (v: any) => void;
  disabled?: boolean;
  error?: string;
}) {
  const f = field;
  const isNumber = (f.type || "").includes("ตัวเลข");
  const type =
    f.type === "วันที่และเวลา"
      ? "datetime-local"
      : f.type === "วันที่"
        ? "date"
        : f.type === "เวลา"
          ? "time"
          : isNumber
            ? "number"
            : "text";
  return (
    <label
      data-field={f.id}
      className={"field " + (f.type === "ข้อความหลายบรรทัด" ? "wide" : "")}
    >
      <span>
        {f.label} {f.required && <b>*</b>}{" "}
      </span>
      {f.options?.length ? (
        <select
          disabled={disabled}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— กรุณาเลือก —</option>
          {[...new Set([...f.options, ...(value ? [value] : [])])].map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : f.type === "เช็กบ็อกซ์" ? (
        <input
          disabled={disabled}
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
        />
      ) : f.type === "ข้อความหลายบรรทัด" ? (
        <textarea
          disabled={disabled}
          maxLength={f.max}
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          disabled={disabled}
          type={type}
          min={isNumber ? 0 : undefined}
          step={
            isNumber ? (f.type?.includes("ทศนิยม") ? "0.01" : "1") : undefined
          }
          maxLength={f.max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}{" "}
      {(type === "date" || type === "datetime-local") && value && (
        <small className="date-preview">{fmt(String(value))}</small>
      )}
      {error && <em>{error}</em>}
    </label>
  );
}
function Multi({
  label,
  options,
  value = [],
  onChange,
  disabled = false,
}: {
  label: string;
  options: string[];
  value?: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div className="field wide">
      <span>{label}</span>
      <div className="checks">
        {options.map((o) => (
          <label key={o}>
            <input
              type="checkbox"
              disabled={disabled}
              checked={value.includes(o)}
              onChange={() =>
                onChange(
                  value.includes(o)
                    ? value.filter((v) => v !== o)
                    : [...value, o],
                )
              }
            />
            {o}
          </label>
        ))}
      </div>
    </div>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="form-section">
      <h3>{title}</h3>
      <div className="form-grid">{children}</div>
    </section>
  );
}
function ChildForm({
  child,
  onChange,
  disabled,
  serviceDate,
  integrated = false,
  children,
}: {
  child: Child;
  onChange: (c: Child) => void;
  disabled: boolean;
  serviceDate: string;
  integrated?: boolean;
  children?: React.ReactNode;
}) {
  const set = (k: string, v: any) => onChange({ ...child, [k]: v });
  const basic = [
    { id: "name", label: "ชื่อเด็ก", required: true },
    { id: "surname", label: "นามสกุล", required: true },
    { id: "birth", label: "วันเกิด", type: "วันที่" },
    {
      id: "sex",
      label: "เพศ",
      options: ["ชาย", "หญิง", "เพศทางเลือก", "ไม่ทราบ"],
    },
    { id: "role", label: "บทบาทในคดี", options: opts.role },
  ];
  const InfoSection = integrated
    ? ({ children }: { children: React.ReactNode; title: string }) => <div className="form-grid">{children}</div>
    : Section;
  return (
    <div className={integrated ? "form-section" : undefined}>
      {integrated && <h3>ข้อมูลผู้ขอรับคำปรึกษา</h3>}
      <InfoSection title="ข้อมูลเด็กและการดูแล">
        {children}
        {!integrated && basic.map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={child[f.id]}
            disabled={disabled}
            onChange={(v) => set(f.id, v)}
          />
        ))}
        {!integrated && <FieldInput
          field={{ id: "computedAge", label: "อายุ ณ วันที่รับบริการ (คำนวณ)" }}
          value={(() => {
            const a = ageAt(child.birth, serviceDate);
            return a ? `${a.years} ปี ${a.months} เดือน` : "";
          })()}
          disabled
          onChange={() => {}}
        />}
        <FieldInput
          field={{
            id: "disability",
            label: "ความบกพร่องทางร่างกาย",
            options: opts.disability,
          }}
          value={child.disability}
          disabled={disabled}
          onChange={(v) => set("disability", v)}
        />
        {child.disability === "มี" && (
          <>
            <Multi
              label="ประเภทความบกพร่อง (เลือกได้หลายข้อ)"
              options={opts.disabilityTypes}
              value={child.disabilityTypes}
              disabled={disabled}
              onChange={(v) => set("disabilityTypes", v)}
            />
            {[
              "รายละเอียดความบกพร่อง",
              "อุปกรณ์ช่วยเหลือ",
              "สิ่งอำนวยความสะดวกที่ต้องการ",
            ].map((label, i) => (
              <FieldInput
                key={label}
                field={{
                  id: ["disabilityDetail", "devices", "accessibility"][i],
                  label,
                }}
                value={
                  child[["disabilityDetail", "devices", "accessibility"][i]]
                }
                disabled={disabled}
                onChange={(v) =>
                  set(["disabilityDetail", "devices", "accessibility"][i], v)
                }
              />
            ))}
          </>
        )}
        <FieldInput
          field={{
            id: "education",
            label: "สถานะการศึกษา",
            options: opts.education,
          }}
          value={child.education}
          disabled={disabled}
          onChange={(v) => set("education", v)}
        />
        <FieldInput
          field={{ id: "level", label: "ระดับการศึกษา", options: opts.level }}
          value={child.level}
          disabled={disabled}
          onChange={(v) => set("level", v)}
        />
        {[
          { id: "grade", label: "ชั้นปี" },
          { id: "school", label: "ชื่อสถานศึกษา" },
          {
            id: "schoolProvince",
            label: "จังหวัดสถานศึกษา",
            options: provinces,
          },
        ].map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={child[f.id]}
            disabled={disabled}
            onChange={(v) => set(f.id, v)}
          />
        ))}
        {child.education && child.education !== "กำลังศึกษา" && (
          <FieldInput
            field={{
              id: "educationReason",
              label: "เหตุผลที่ไม่ได้ศึกษา / รายละเอียด",
            }}
            value={child.educationReason}
            disabled={disabled}
            onChange={(v) => set("educationReason", v)}
          />
        )}
        <FieldInput
          field={{
            id: "parents",
            label: "สถานภาพของพ่อแม่",
            options: opts.parents,
          }}
          value={child.parents}
          disabled={disabled}
          onChange={(v) => set("parents", v)}
        />
        <FieldInput
          field={{ id: "parentsNote", label: "รายละเอียดสถานภาพพ่อแม่" }}
          value={child.parentsNote}
          disabled={disabled}
          onChange={(v) => set("parentsNote", v)}
        />
        <Multi
          label="เด็กอาศัยอยู่กับใคร (เลือกได้หลายข้อ)"
          options={opts.living}
          value={child.living}
          disabled={disabled}
          onChange={(v) => set("living", v)}
        />
        <FieldInput
          field={{ id: "livingNote", label: "รายละเอียดการอยู่อาศัย" }}
          value={child.livingNote}
          disabled={disabled}
          onChange={(v) => set("livingNote", v)}
        />
        <label className="field">
          <span>ผู้ดูแลหลัก</span>
          <select
            value={child.primary || ""}
            disabled={disabled}
            onChange={(e) => set("primary", e.target.value)}
          >
            <option value="">ยังไม่ได้บันทึก</option>
            <option value="none">ยังไม่มีผู้ดูแลหลัก</option>
            {child.guardians.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name || "ผู้ดูแล"} {g.surname}
              </option>
            ))}
          </select>
        </label>
      </InfoSection>
      {child.guardians.map((g, i) => (
        <Section key={g.id} title={`ผู้ปกครอง / ผู้ดูแล คนที่ ${i + 1}`}>
          {[
            {
              id: "prefix",
              label: "คำนำหน้า",
              options: ["นาย", "นาง", "นางสาว", "อื่น ๆ"],
            },
            { id: "name", label: "ชื่อ" },
            { id: "surname", label: "นามสกุล" },
            {
              id: "relation",
              label: "ความสัมพันธ์กับเด็ก",
              options: opts.relation,
            },
            {
              id: "documentType",
              label: "ประเภทเอกสาร",
              options: [
                "บัตรประชาชน",
                "หนังสือเดินทาง",
                "บัตรต่างด้าว",
                "ไม่มีเอกสาร",
              ],
            },
            { id: "documentNumber", label: "เลขเอกสารประจำตัว" },
            { id: "phone", label: "โทรศัพท์" },
            { id: "address", label: "ที่อยู่", type: "ข้อความหลายบรรทัด" },
            { id: "occupation", label: "อาชีพ / ตำแหน่ง" },
          ].map((f) => (
            <FieldInput
              key={f.id}
              field={f}
              value={g[f.id]}
              disabled={disabled}
              onChange={(v) =>
                set(
                  "guardians",
                  child.guardians.map((x, j) =>
                    j === i ? { ...x, [f.id]: v } : x,
                  ),
                )
              }
            />
          ))}
          <Multi
            label="บทบาทในการดูแล"
            options={opts.guardianRoles}
            value={g.roles || []}
            disabled={disabled}
            onChange={(v) =>
              set(
                "guardians",
                child.guardians.map((x, j) =>
                  j === i ? { ...x, roles: v } : x,
                ),
              )
            }
          />
          {(g.roles || []).some((r: string) =>
            /ครู|สถานสงเคราะห์|สังคม/.test(r),
          ) && (
            <FieldInput
              field={{ id: "agency", label: "หน่วยงาน / สถานศึกษา" }}
              value={g.agency}
              disabled={disabled}
              onChange={(v) =>
                set(
                  "guardians",
                  child.guardians.map((x, j) =>
                    j === i ? { ...x, agency: v } : x,
                  ),
                )
              }
            />
          )}
          <FieldInput
            field={{
              id: "contact",
              label: "ผู้ติดต่อหลัก",
              type: "เช็กบ็อกซ์",
            }}
            value={g.contact}
            disabled={disabled}
            onChange={(v) =>
              set(
                "guardians",
                child.guardians.map((x, j) => ({
                  ...x,
                  contact: j === i ? v : false,
                })),
              )
            }
          />
          <FieldInput
            field={{ id: "note", label: "หมายเหตุ" }}
            value={g.note}
            disabled={disabled}
            onChange={(v) =>
              set(
                "guardians",
                child.guardians.map((x, j) =>
                  j === i ? { ...x, note: v } : x,
                ),
              )
            }
          />
          {!disabled && (
            <button
              className="danger"
              onClick={() => {
                set(
                  "guardians",
                  child.guardians.filter((_, j) => i !== j),
                );
                if (child.primary === g.id)
                  onChange({
                    ...child,
                    guardians: child.guardians.filter((_, j) => i !== j),
                    primary: "",
                  });
              }}
            >
              ลบผู้ดูแลคนนี้
            </button>
          )}
        </Section>
      ))}
      {!disabled && (
        <button
          className="outline"
          onClick={() =>
            set("guardians", [...child.guardians, { id: id(), roles: [] }])
          }
        >
          <Plus size={16} /> เพิ่มผู้ปกครอง / ผู้ดูแล
        </button>
      )}
    </div>
  );
}
function App() {
  const [records, setRecords] = useState<RecordItem[]>(load);
  useEffect(() => {
    const marker = "oag-childaid-office-distribution-v2";
    if (localStorage.getItem(marker)) return;
    setRecords(current => {
      const next = redistributeSamples(current, offices, provinces);
      try {
        localStorage.setItem("oag-childaid-v1", JSON.stringify(next));
        localStorage.setItem(marker, "1");
      } catch { /* Keep updated samples in memory when storage is unavailable. */ }
      return next;
    });
  }, []);
  const [page, setPage] = useState<string>("dashboard");
  const [draft, setDraft] = useState<RecordItem | null>(null);
  const [readonly, setReadonly] = useState(false);
  const [filters, setFilters] = useState<Values>({});
  const [active, setActive] = useState<Values>({});
  const [pagination, setPagination] = useState(1);
  const [errors, setErrors] = useState<Values>({});
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [reportKind, setReportKind] = useState("");
  const persist = (next: RecordItem[]) => {
    try {
      localStorage.setItem("oag-childaid-v1", JSON.stringify(next));
      setRecords(next);
      return true;
    } catch {
      setToast("ไม่สามารถบันทึกได้ พื้นที่จัดเก็บในเบราว์เซอร์ไม่เพียงพอ");
      return false;
    }
  };
  const navigate = (p: string, f: Values = {}) => {
    setPage(p);
    setDraft(null);
    setFilters(f);
    setActive(f);
    setPagination(1);
    setMobile(false);
    setErrors({});
  };
  const chartPeriod = dashboardPeriod(active);
  const selected = records.filter((r) =>
    matches(r, {
      ...active,
      ...(["consult", "case", "activity"].includes(page)
        ? { kind: page }
        : page === "reports"
          ? { kind: reportKind }
          : {}),
    }),
  );
  const newRecord = (kind: Kind) => {
    const n =
      Math.max(
        0,
        ...records
          .filter((r) => r.kind === kind)
          .map((r) => Number(r.number.split("-")[1]?.split("/")[0]) || 0),
      ) + 1;
    const date = "2026-10-01";
    setDraft({
      id: id(),
      kind,
      number: `${kind === "consult" ? "CA" : kind === "case" ? "PR" : "AC"}-${String(n).padStart(4, "0")}/2570`,
      office: offices[0],
      province: provinces[0],
      status: "ร่าง",
      values: {
        F01: `CA-${String(n).padStart(4, "0")}/2570`,
        F05: date + "T09:00",
        F03: offices[0],
        date,
        P10: date,
        owner: "เจ้าหน้าที่ตัวอย่าง",
      },
      children: kind === "activity" ? [] : [blankChild()],
    });
    setReadonly(false);
    setErrors({});
  };
  const edit = (r: RecordItem, ro: boolean) => {
    setDraft(JSON.parse(JSON.stringify(r)));
    setReadonly(ro);
    setErrors({});
  };
  const fields = draft
    ? ((draft.kind === "consult"
        ? schema.consult
        : draft.kind === "activity"
          ? schema.activity
          : caseFields) as Field[])
    : [];
  const subOptions = () => {
    if (!draft) return [];
    const topic = draft.values.F09;
    const refs = schema.consultReferences as any;
    return topic === "ปัญหากฎหมายแพ่งและพาณิชย์"
      ? refs.F10_อื่นๆ.filter((r: any) => /^\d+$/.test(r[0])).map(
          (r: any) => r[1],
        )
      : topic === "ปัญหากฎหมายอาญา"
        ? refs["อื่นๆ_อาญา"]
            .filter((r: any) => /^\d+$/.test(r[0]))
            .map((r: any) => r[1])
        : topic === "ปัญหากฎหมายอื่นๆ"
          ? refs["อื่นๆ_กฎหมายอื่น"]
              .filter((r: any) => /^\d+$/.test(r[0]))
              .map((r: any) => r[1])
          : [];
  };
  const save = () => {
    if (!draft) return;
    const err: Values = {};
    [
      ...fields,
      ...commonFields.filter(
        (f) => draft.kind !== "activity" || f.id === "owner",
      ),
    ].forEach((f) => {
      if (f.id === "F10" && !subOptions().length) return;
      const v = draft.values[f.id];
      if (f.required && (v === undefined || v === ""))
        err[f.id] = "กรุณากรอกข้อมูล";
      if (f.max && String(v || "").length > f.max)
        err[f.id] = `ไม่เกิน ${f.max} ตัวอักษร`;
      if (
        f.type?.includes("ตัวเลข") &&
        v !== undefined &&
        v !== "" &&
        (Number(v) < 0 ||
          !Number.isFinite(Number(v)) ||
          (!f.type.includes("ทศนิยม") && !Number.isInteger(Number(v))))
      )
        err[f.id] = "กรุณากรอกตัวเลขที่ถูกต้องและไม่ติดลบ";
    });
    if (draft.kind !== "activity")
      draft.children.forEach((c, i) => {
        if (!c.name || !c.surname)
          err.children = `กรุณากรอกชื่อและนามสกุลเด็กคนที่ ${i + 1}`;
        if (c.birth && c.birth > recordDate(draft))
          err.children = "วันเกิดต้องไม่อยู่หลังวันที่รับบริการ";
      });
    if (draft.kind === "activity") {
      const total = Array.from({ length: 9 }, (_, i) =>
        Number(draft.values["P" + (i + 14)] || 0),
      ).reduce((a, b) => a + b, 0);
      if (total !== Number(draft.values.P13 || 0))
        err.P13 = `ยอดแยกกลุ่ม ${total} คน ไม่ตรงกับยอดรวม`;
      if (
        draft.values.P08 > draft.values.P09 ||
        draft.values.P09 > draft.values.P10
      )
        err.P10 = "วันที่เสนอ ≤ วันที่อนุมัติ ≤ วันที่ดำเนินโครงการ";
    }
    if (draft.kind === "consult") {
      if (draft.values.F18 > recordDate(draft))
        err.F18 = "วันเกิดต้องไม่อยู่หลังวันที่รับบริการ";
      if (
        draft.values.F06 &&
        draft.values.F05 &&
        draft.values.F06 < draft.values.F05.slice(11, 16)
      )
        err.F06 = "เวลาเสร็จต้องไม่น้อยกว่าเวลาเริ่ม";
    }
    setErrors(err);
    if (Object.keys(err).length) {
      setToast("กรุณาตรวจสอบช่องที่ระบุข้อผิดพลาด");
      return;
    }
    if (
      persist(
        records.some((r) => r.id === draft.id)
          ? records.map((r) => (r.id === draft.id ? draft : r))
          : [draft, ...records],
      )
    ) {
      setDraft(null);
      setToast("บันทึกข้อมูลเรียบร้อยแล้ว");
    }
  };
  const setValue = (k: string, v: any) => {
    if (!draft) return;
    const values = { ...draft.values, [k]: v };
    let children = draft.children;
    if (k === "F09") values.F10 = "";
    if (k === "F18" || k === "F05") {
      const a = ageAt(values.F18, (values.F05 || "").slice(0, 10));
      values.F19 = a ? a.years : "";
      values.F20 = a ? a.months : "";
    }
    if (["F13", "F14", "F18", "F17"].includes(k) && children[0])
      children = [
        {
          ...children[0],
          [{ F13: "name", F14: "surname", F18: "birth", F17: "sex" }[
            k
          ] as string]: v,
        },
      ];
    setDraft({
      ...draft,
      values,
      children,
      ...(k === "F03" ? { office: v } : k === "F36" ? { province: v } : {}),
    });
  };
  const filterPanel = (
    <div className="filter-panel">
      {page !== "dashboard" && <div className="filter-title">
        <Search size={17} /> เงื่อนไขค้นหา{" "}
        <span>กำหนดขอบเขตข้อมูลที่ต้องการแสดง</span>
      </div>}
      <div className="filter-grid">
        {page === "reports" && (
          <label className="field">
            <span>ประเภทรายงาน</span>
            <select
              value={reportKind}
              onChange={(e) => setReportKind(e.target.value)}
            >
              <option value="">สรุปภาพรวม</option>
              {(["consult", "case", "activity"] as Kind[]).map((k) => (
                <option value={k} key={k}>
                  {names[k]}
                </option>
              ))}
            </select>
          </label>
        )}
        {[
          { id: "year", label: "ปีงบประมาณ", options: ["2569", "2570"] },
          { id: "from", label: "วันที่เริ่มต้น", type: "วันที่" },
          { id: "to", label: "วันที่สิ้นสุด", type: "วันที่" },
          { id: "office", label: "สำนักงาน", options: offices },
          { id: "province", label: "จังหวัด", options: provinces },
          { id: "status", label: "สถานะ", options: statuses },
          { id: "q", label: "เลขรายการ / ชื่อเด็ก / ชื่อโครงการ" },
        ].map((f) => (
          <FieldInput
            key={f.id}
            field={f}
            value={filters[f.id]}
            onChange={(v) => setFilters({ ...filters, [f.id]: v })}
          />
        ))}
        <details className="advanced">
          <summary>เงื่อนไขเพิ่มเติมสำหรับการวิเคราะห์</summary>
          <div className="filter-grid">
            {Object.entries({
              disability: opts.disability,
              education: opts.education,
              level: opts.level,
              parents: opts.parents,
              living: opts.living,
              role: opts.role,
              guardianRole: opts.guardianRoles,
              category: [
                ...new Set(
                  records.map((r) =>
                    r.kind === "consult"
                      ? r.values.F09
                      : r.kind === "case"
                        ? r.values.caseType
                        : r.values.P01,
                  ),
                ),
              ],
              outcome: [
                "อยู่ระหว่างติดตาม",
                "ได้รับความช่วยเหลือ",
                "ส่งต่อแล้ว",
                "ยุติเรื่อง",
              ],
            }).map(([k, options]) => (
              <FieldInput
                key={k}
                field={{
                  id: k,
                  label: (
                    {
                      disability: "ความบกพร่อง",
                      education: "สถานะการศึกษา",
                      level: "ระดับการศึกษา",
                      parents: "สถานภาพพ่อแม่",
                      living: "อาศัยอยู่กับ",
                      role: "บทบาทเด็ก",
                      category: "ประเภทปัญหา / งาน",
                      guardianRole: "บทบาทผู้ดูแล",
                      outcome: "ผลการช่วยเหลือ",
                    } as Values
                  )[k],
                  options: [
                    ...options,
                    ...([
                      "disability",
                      "education",
                      "level",
                      "parents",
                      "living",
                    ].includes(k)
                      ? ["ยังไม่ได้บันทึก"]
                      : []),
                  ],
                }}
                value={filters[k]}
                onChange={(v) => setFilters({ ...filters, [k]: v })}
              />
            ))}
          </div>
        </details>
      </div>
      <div className="filter-actions">
        <button
          className="primary"
          onClick={() => {
            if (filters.from && filters.to && filters.from > filters.to) {
              setToast("วันที่เริ่มต้นต้องไม่อยู่หลังวันที่สิ้นสุด");
              return;
            }
            setActive({ ...filters });
            setPagination(1);
          }}
        >
          <Search size={16} />
          {page === "reports" ? "เรียกรายงาน" : "ค้นหา"}
        </button>
        <button
          className="outline"
          onClick={() => {
            setFilters({});
            setActive({});
            setPagination(1);
          }}
        >
          <RotateCcw size={15} />
          ล้างเงื่อนไข
        </button>
      </div>
    </div>
  );
  const title = (r: RecordItem) =>
    r.kind === "activity"
      ? r.values.P03
      : r.children.map((c) => `${c.name} ${c.surname}`).join(", ");
  const exportCsv = () => {
    const rows = [
      [
        "เลขรายการ",
        "ประเภทงาน",
        "ชื่อเด็ก / โครงการ",
        "วันที่",
        "ปีงบประมาณ",
        "สำนักงาน",
        "จังหวัด",
        "สถานะ",
        "ประเภทปัญหา / งาน",
        "ผลช่วยเหลือ",
        "ความบกพร่อง",
        "สถานะการศึกษา",
        "ระดับการศึกษา",
        "สถานภาพพ่อแม่",
        "อาศัยอยู่กับ",
      ],
      ...selected.map((r) => [
        r.number,
        names[r.kind],
        title(r),
        fmt(recordDate(r)),
        fiscalYear(recordDate(r)),
        r.office,
        r.province,
        r.status,
        r.kind === "consult"
          ? r.values.F09
          : r.kind === "case"
            ? r.values.caseType
            : r.values.P01,
        r.values.outcome,
        (r.children || [])
          .map((c) => c.disability || "ยังไม่ได้บันทึก")
          .join(";"),
        r.children.map((c) => c.education || "ยังไม่ได้บันทึก").join(";"),
        r.children.map((c) => c.level || "ยังไม่ได้บันทึก").join(";"),
        r.children.map((c) => c.parents || "ยังไม่ได้บันทึก").join(";"),
        r.children.map((c) => (c.living || []).join("/")).join(";"),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([csv(rows)], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "OAG-ChildAid-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  const table = (
    <div className={"table-card " + (page === "reports" ? "report-all" : "")}>
      <div className="table-top">
        <h3>{page === "reports" ? "ผลรายงาน" : "รายการข้อมูล"}</h3>
        <span>พบ {selected.length} รายการ</span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>ลำดับ / เลขรายการ</th>
              <th>ชื่อเด็ก / ชื่อโครงการ</th>
              <th>วันที่ / ปีงบประมาณ</th>
              <th>สำนักงาน / จังหวัด</th>
              <th>ประเภทงาน</th>
              <th>สถานะ</th>
              <th className="no-print">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {(page === "reports"
              ? selected
              : selected.slice((pagination - 1) * 6, pagination * 6)
            ).map((r, i) => (
              <tr key={r.id}>
                <td>
                  <small>{(pagination - 1) * 6 + i + 1}</small>
                  <strong>{r.number}</strong>
                </td>
                <td>
                  {title(r) || "—"}
                  <small>
                    {r.kind === "activity"
                      ? `${num(r.values.P13)} คน-ครั้ง`
                      : r.values.F09 || r.values.charge}
                  </small>
                </td>
                <td>
                  {fmt(recordDate(r))}
                  <small>ปีงบประมาณ {fiscalYear(recordDate(r))}</small>
                </td>
                <td>
                  {r.office}
                  <small>{r.province}</small>
                </td>
                <td>
                  {r.kind === "activity"
                    ? "กิจกรรม"
                    : r.kind === "consult"
                      ? "คำปรึกษา"
                      : "งานอัยการ"}
                </td>
                <td>
                  <span
                    className={
                      "badge " +
                      (r.status === "เสร็จสิ้น"
                        ? "green"
                        : r.status === "ส่งต่อ"
                          ? "blue"
                          : "orange")
                    }
                  >
                    {r.status}
                  </span>
                </td>
                <td className="row-actions no-print">
                  <button title="ดูรายละเอียด" onClick={() => edit(r, true)}>
                    <Eye size={17} />
                  </button>
                  <button title="แก้ไข" onClick={() => edit(r, false)}>
                    <Pencil size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!selected.length && (
          <div className="empty">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>
        )}
      </div>
      <div className="pagination">
        <span>
          แสดง {selected.length ? (pagination - 1) * 6 + 1 : 0}–
          {Math.min(pagination * 6, selected.length)} จาก {selected.length}{" "}
          รายการ
        </span>
        <div>
          <button
            disabled={pagination === 1}
            onClick={() => setPagination(pagination - 1)}
          >
            ก่อนหน้า
          </button>
          {Array.from({ length: Math.ceil(selected.length / 6) }, (_, i) => (
            <button
              className={pagination === i + 1 ? "current" : ""}
              key={i}
              onClick={() => setPagination(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            disabled={pagination >= Math.ceil(selected.length / 6)}
            onClick={() => setPagination(pagination + 1)}
          >
            ถัดไป
          </button>
        </div>
      </div>
    </div>
  );
  const children = childrenFor(selected, active) as Child[];
  const drill = (f: Values, kind?: string) =>
    navigate(kind || "reports", { ...active, ...f });
  const distribution = (label: string, key: string, multi = false) => {
    const counts: Values = {};
    children.forEach((c) => {
      const vals = multi
        ? c[key]?.length
          ? c[key]
          : ["ยังไม่ได้บันทึก"]
        : [c[key] || "ยังไม่ได้บันทึก"];
      vals.forEach((v: string) => (counts[v] = (counts[v] || 0) + 1));
    });
    return (
      <Chart
        title={label}
        unit="คนตามงาน"
        counts={counts}
        note={
          multi
            ? "เลือกได้หลายข้อ ผลรวมอาจเกินจำนวนเด็ก"
            : "เด็กภายในแต่ละงาน • ไม่ตัดซ้ำข้ามงาน"
        }
        onClick={(v) => drill({ [key]: v })}
      />
    );
  };
  const countBy = (list: RecordItem[], fn: (r: RecordItem) => string) =>
    list.reduce((a: Values, r) => {
      const k = fn(r) || "ยังไม่ได้บันทึก";
      a[k] = (a[k] || 0) + 1;
      return a;
    }, {});
  const activities = selected.filter((r) => r.kind === "activity");
  return (
    <div className="app">
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <Scale size={37} />
          <div>
            สารบบคดีอิเล็กทรอนิกส์<small>สำนักงานอัยการสูงสุด</small>
          </div>
        </div>
        <div className="system-label">ระบบงาน</div>
        <div className="legacy-menu">
          <Scale size={17} /> คดีอาญา <ChevronRight size={16} />
        </div>
        <div className="menu-group">
          <ShieldCheck size={20} />
          <b>OAG ChildAid</b>
          <ChevronDown size={16} />
        </div>
        <div className="menu-caption">ระบบอัยการช่วยเด็ก</div>
        <nav>
          {Object.entries(names).map(([k, label]) => {
            const Icon = (
              {
                consult: Users,
                case: Scale,
                activity: CalendarDays,
                dashboard: LayoutDashboard,
                reports: FileBarChart2,
              } as any
            )[k];
            return (
              <button
                className={page === k ? "active" : ""}
                key={k}
                onClick={() => navigate(k)}
              >
                <Icon size={19} />
                <span>{label}</span>
                {page === k && <ChevronRight size={15} />}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="demo-label">MOCKUP • ข้อมูลสมมติ</div>
          <button onClick={() => setResetDialog(true)}>
            <RotateCcw size={15} />
            คืนค่าข้อมูลตัวอย่าง
          </button>
          <small>OAG ChildAid · เวอร์ชัน 1.0</small>
        </div>
      </aside>
      <div className="workspace">
        <header>
          <button className="hamburger" onClick={() => setMobile(!mobile)}>
            <Menu />
          </button>
          <span>วันที่ 01 ตุลาคม 2569</span>
          <div className="user">
            <div className="avatar">อ</div>
            <span>
              เจ้าหน้าที่ตัวอย่าง<small>สำนักงานอัยการสูงสุด</small>
            </span>
            <ChevronDown size={16} />
          </div>
        </header>
        <div className="breadcrumb">
          สารบบคดีอิเล็กทรอนิกส์ <ChevronRight size={14} /> OAG ChildAid{" "}
          <ChevronRight size={14} /> {names[page as keyof typeof names]}
          {draft && (
            <>
              {" "}
              <ChevronRight size={14} />
              {readonly ? "รายละเอียด" : "บันทึกข้อมูล"}
            </>
          )}
        </div>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">OAG CHILDAID / ระบบอัยการช่วยเด็ก</div>
              <h1>
                {draft
                  ? readonly
                    ? "รายละเอียดข้อมูล"
                    : "บันทึก" + names[draft.kind]
                  : names[page as keyof typeof names]}
              </h1>
              <p>
                {draft
                  ? "จัดเก็บข้อมูลอย่างเป็นระบบ เพื่อการช่วยเหลือและติดตามเด็ก"
                  : page === "dashboard"
                    ? "ภาพรวมการช่วยเหลือเด็กและผลการดำเนินงาน"
                    : page === "reports"
                      ? "เรียกดูข้อมูลและสรุปผลตามเงื่อนไขที่ต้องการ"
                      : "ค้นหาและจัดการข้อมูลการดำเนินงาน"}
              </p>
            </div>
            {!draft && ["consult", "case", "activity"].includes(page) && (
              <button
                className="primary"
                onClick={() => newRecord(page as Kind)}
              >
                <Plus size={18} />
                เพิ่มข้อมูล
              </button>
            )}
            {draft && (
              <button className="outline" onClick={() => setDraft(null)}>
                <ArrowLeft size={16} />
                กลับหน้ารายการ
              </button>
            )}
          </div>
          {draft ? (
            <>
              <div className="record-banner">
                <strong>{draft.number}</strong>
                <span>
                  ข้อมูลเด็กแยกตามงาน •{" "}
                  {draft.kind === "consult"
                    ? "คำปรึกษา"
                    : draft.kind === "case"
                      ? "งานอัยการ"
                      : "กิจกรรม"}
                </span>
                <span className="badge orange">{draft.status}</span>
              </div>
              <Section title="ข้อมูลการดำเนินงาน">
                <FieldInput
                  field={{
                    id: "office",
                    label: "สำนักงาน",
                    options: offices,
                    required: true,
                  }}
                  value={draft.office}
                  disabled={readonly}
                  onChange={(v) =>
                    setDraft({
                      ...draft,
                      office: v,
                      values: { ...draft.values, F03: v },
                    })
                  }
                />
                <FieldInput
                  field={{
                    id: "province",
                    label: "จังหวัด",
                    options: provinces,
                    required: true,
                  }}
                  value={draft.province}
                  disabled={readonly}
                  onChange={(v) => setDraft({ ...draft, province: v })}
                />
                <FieldInput
                  field={{ id: "status", label: "สถานะ", options: statuses }}
                  value={draft.status}
                  disabled={readonly}
                  onChange={(v) => setDraft({ ...draft, status: v })}
                />
                <FieldInput
                  field={{ id: "fy", label: "ปีงบประมาณ (คำนวณจากวันที่)" }}
                  value={recordDate(draft) ? fiscalYear(recordDate(draft)) : ""}
                  disabled
                  onChange={() => {}}
                />
              </Section>
              {[
                ...new Set(fields.map((f) => f.group || "รายละเอียดงานอัยการ")),
              ].map((group) => draft.kind === "consult" && group.startsWith("ข้อมูลผู้ขอรับคำปรึกษา") ? (
                group === fields.find(f => f.group?.startsWith("ข้อมูลผู้ขอรับคำปรึกษา"))?.group && draft.children[0] ?
                <ChildForm key="consult-applicant" integrated child={draft.children[0]} serviceDate={recordDate(draft)} disabled={readonly}
                  onChange={next => setDraft({...draft, children: [next]})}>
                  {fields.filter(f => f.group?.startsWith("ข้อมูลผู้ขอรับคำปรึกษา")).map(f =>
                    <FieldInput key={f.id} field={f} value={draft.values[f.id]} error={errors[f.id]} disabled={readonly || ["F19", "F20"].includes(f.id)} onChange={v=>setValue(f.id,v)}/>
                  )}
                  <p className="notice wide">ข้อมูลเพิ่มเติมของเด็กและผู้ดูแลไม่บังคับกรอก • ช่องว่างหมายถึงยังไม่ได้บันทึก</p>
                  {errors.children && <p className="error wide">{errors.children}</p>}
                </ChildForm> : null
              ) : (
                <Section key={group} title={group}>
                  {fields
                    .filter((f) => (f.group || "รายละเอียดงานอัยการ") === group)
                    .filter((f) => f.id !== "F10" || subOptions().length)
                    .filter((f) => f.id !== "F02")
                    .map((f) => (
                      <FieldInput
                        key={f.id}
                        field={
                          f.id === "F10" ? { ...f, options: subOptions() } : f
                        }
                        value={draft.values[f.id]}
                        error={errors[f.id]}
                        disabled={
                          readonly || ["F01", "F19", "F20"].includes(f.id)
                        }
                        onChange={(v) => setValue(f.id, v)}
                      />
                    ))}
                </Section>
              ))}
              {draft.kind === "case" && (
                <>
                  <p className="notice">
                    ข้อมูลเพิ่มเติมของเด็กและผู้ดูแลไม่บังคับกรอก •
                    ช่องว่างหมายถึงยังไม่ได้บันทึก
                  </p>
                  {errors.children && (
                    <p className="error">{errors.children}</p>
                  )}
                  {draft.children.map((c, i) => (
                    <div key={c.id} className="child-block">
                      <div className="child-heading">
                        <b>เด็กคนที่ {i + 1}</b>
                        {draft.kind === "case" &&
                          !readonly &&
                          draft.children.length > 1 && (
                            <button
                              className="danger"
                              onClick={() =>
                                setDraft({
                                  ...draft,
                                  children: draft.children.filter(
                                    (_, j) => j !== i,
                                  ),
                                })
                              }
                            >
                              ลบเด็กคนนี้
                            </button>
                          )}
                      </div>
                      <ChildForm
                        child={c}
                        serviceDate={recordDate(draft)}
                        disabled={readonly}
                        onChange={(next) => {
                          let values = draft.values;
                          if (draft.kind === "consult" && i === 0) {
                            const age = ageAt(next.birth, recordDate(draft));
                            values = {
                              ...values,
                              F13: next.name,
                              F14: next.surname,
                              F18: next.birth,
                              F17: next.sex,
                              F19: age ? age.years : "",
                              F20: age ? age.months : "",
                            };
                          }
                          setDraft({
                            ...draft,
                            values,
                            children: draft.children.map((x, j) =>
                              j === i ? next : x,
                            ),
                          });
                        }}
                      />
                    </div>
                  ))}
                  {draft.kind === "case" && !readonly && (
                    <button
                      className="outline"
                      onClick={() =>
                        setDraft({
                          ...draft,
                          children: [...draft.children, blankChild()],
                        })
                      }
                    >
                      <Plus size={16} />
                      เพิ่มเด็กที่เกี่ยวข้อง
                    </button>
                  )}
                </>
              )}
              {draft.kind === "case" && (
                <>
                  <Section title="รายการคำปรึกษาอ้างอิง">
                    <label className="field wide">
                      <span>
                        อ้างอิงคำปรึกษา (ข้อมูลเด็กยังแยกจากงานอัยการ)
                      </span>
                      <select
                        disabled={readonly}
                        value={draft.values.consultRef || ""}
                        onChange={(e) => setValue("consultRef", e.target.value)}
                      >
                        <option value="">ไม่มีรายการอ้างอิง</option>
                        {records
                          .filter((r) => r.kind === "consult")
                          .map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.number} — {title(r)}
                            </option>
                          ))}
                      </select>
                    </label>
                  </Section>
                  <Section title="ประวัติขั้นตอนดำเนินงาน">
                    {(draft.values.history || []).map(
                      (h: Values, i: number) => (
                        <div className="history-row wide" key={i}>
                          {[
                            {
                              id: "date",
                              label: "วันที่ดำเนินการ",
                              type: "วันที่",
                            },
                            { id: "step", label: "ขั้นตอน" },
                            { id: "detail", label: "รายละเอียด" },
                          ].map((f) => (
                            <FieldInput
                              key={f.id}
                              field={f}
                              value={h[f.id]}
                              disabled={readonly}
                              onChange={(v) =>
                                setValue(
                                  "history",
                                  draft.values.history.map(
                                    (x: Values, j: number) =>
                                      i === j ? { ...x, [f.id]: v } : x,
                                  ),
                                )
                              }
                            />
                          ))}
                          {!readonly && (
                            <button
                              className="danger"
                              onClick={() =>
                                setValue(
                                  "history",
                                  draft.values.history.filter(
                                    (_: Values, j: number) => j !== i,
                                  ),
                                )
                              }
                            >
                              ลบ
                            </button>
                          )}
                        </div>
                      ),
                    )}
                    {!readonly && (
                      <button
                        className="outline"
                        onClick={() =>
                          setValue("history", [
                            ...(draft.values.history || []),
                            { date: "", step: "", detail: "" },
                          ])
                        }
                      >
                        <Plus size={16} />
                        เพิ่มขั้นตอน
                      </button>
                    )}
                  </Section>
                </>
              )}
              <Section
                title={
                  draft.kind === "activity"
                    ? "ข้อมูลเพิ่มเติมเพื่อการวิเคราะห์"
                    : "การช่วยเหลือและติดตามผล"
                }
              >
                {[
                  ...commonFields.filter(
                    (f) => draft.kind !== "activity" || f.id === "owner",
                  ),
                  ...(draft.kind === "activity" ? activityExtra : []),
                ].map((f) => (
                  <FieldInput
                    key={f.id}
                    field={f}
                    value={draft.values[f.id]}
                    error={errors[f.id]}
                    disabled={readonly}
                    onChange={(v) => setValue(f.id, v)}
                  />
                ))}
              </Section>
              <div className="form-footer">
                {readonly ? (
                  <button
                    className="primary"
                    onClick={() => setReadonly(false)}
                  >
                    <Pencil size={16} />
                    แก้ไขข้อมูล
                  </button>
                ) : (
                  <button className="primary" onClick={save}>
                    <Check size={17} />
                    บันทึกข้อมูล
                  </button>
                )}
                <button className="outline" onClick={() => setDraft(null)}>
                  ยกเลิก / กลับ
                </button>
              </div>
            </>
          ) : (
            <>
              {page === "dashboard" ? (
                <details className="dashboard-filters">
                  <summary>
                    <Search size={17} />
                    <strong>เงื่อนไขค้นหา</strong>
                    <span>{Object.values(active).filter(Boolean).length ? `ใช้ ${Object.values(active).filter(Boolean).length} เงื่อนไข` : "แสดงข้อมูลทั้งหมด"}</span>
                    <span className="filter-toggle-label">เปิด / ย่อเงื่อนไข</span>
                    <ChevronDown size={17} className="filter-toggle-icon" />
                  </summary>
                  {filterPanel}
                </details>
              ) : filterPanel}
              {page === "dashboard" ? (
                <>
                  <div className="stats">
                    {[
                      {
                        label: "รายการคำปรึกษา",
                        value: selected.filter((r) => r.kind === "consult")
                          .length,
                        unit: "รายการ",
                        kind: "consult",
                        icon: Users,
                      },
                      {
                        label: "งานชั้นพนักงานอัยการ",
                        value: selected.filter((r) => r.kind === "case").length,
                        unit: "คดี",
                        kind: "case",
                        icon: Scale,
                      },
                      {
                        label: "เด็กในแต่ละงาน",
                        value: children.length,
                        unit: "คนตามงาน",
                        kind: "reports",
                        icon: ShieldCheck,
                      },
                      {
                        label: "กิจกรรม",
                        value: activities.length,
                        unit: "กิจกรรม",
                        kind: "activity",
                        icon: CalendarDays,
                      },
                      {
                        label: "ผู้เข้าร่วมกิจกรรม",
                        value: activities.reduce(
                          (a, r) => a + Number(r.values.P13 || 0),
                          0,
                        ),
                        unit: "คน-ครั้ง",
                        kind: "activity",
                        icon: Users,
                      },
                    ].map((s) => (
                      <button
                        key={s.label}
                        className="stat"
                        onClick={() =>
                          drill(
                            s.kind === "reports" ? { childOnly: true } : {},
                            s.kind,
                          )
                        }
                      >
                        <div>
                          <span>{s.label}</span>
                          <s.icon size={21} />
                        </div>
                        <strong>
                          {num(s.value)}
                          <small>{s.unit}</small>
                        </strong>
                        <footer>
                          ดูรายการที่เกี่ยวข้อง <ChevronRight size={13} />
                        </footer>
                      </button>
                    ))}
                  </div>
                  <p className="notice">
                    นับเด็กไม่ซ้ำภายในแต่ละงานด้วยรหัสของงานนั้น
                    และไม่ตัดซ้ำข้ามงานคำปรึกษา–งานอัยการ •
                    ใช้ข้อมูลเด็กปัจจุบัน • ข้อมูลทั้งหมดเป็นข้อมูลสมมติ
                  </p>
                  <div className="chart-grid">
                    <Chart
                      title="แนวโน้มการดำเนินงานรายเดือน"
                      type="line"
                      counts={monthlyCounts(countBy(selected, (r) => recordDate(r)?.slice(0, 7)), chartPeriod.from, chartPeriod.to)}
                      onClick={(v) => drill(monthRange(v, active))}
                    />
                    <Chart
                      title="สถานะการดำเนินงาน"
                      type="donut"
                      counts={countBy(selected, (r) => r.status)}
                      onClick={(v) => drill({ status: v })}
                    />
                    <Chart
                      title="ประเภทปัญหาที่รับคำปรึกษา"
                      counts={countBy(
                        selected.filter((r) => r.kind === "consult"),
                        (r) => r.values.F09,
                      )}
                      onClick={(v) => drill({ category: v }, "consult")}
                    />
                    {
                      <Chart
                        title="บทบาทเด็กในคดี"
                        type="donut"
                        unit="คนตามงาน"
                        counts={childrenFor(
                          selected.filter((r) => r.kind === "case"),
                          active,
                        ).reduce((a: Values, c: Values) => {
                          a[c.role || "ยังไม่ได้บันทึก"] =
                            (a[c.role || "ยังไม่ได้บันทึก"] || 0) + 1;
                          return a;
                        }, {})}
                        onClick={(v) => drill({ role: v }, "case")}
                      />
                    }
                    <Chart
                      title="ผลการช่วยเหลือ"
                      counts={countBy(
                        selected.filter((r) => r.kind !== "activity"),
                        (r) => r.values.outcome,
                      )}
                      onClick={(v) => drill({ outcome: v })}
                    />
                    <Chart
                      title="ปริมาณงานแยกสำนักงาน"
                      counts={countBy(selected, (r) => r.office)}
                      onClick={(v) => drill({ office: v })}
                    />
                    <ProvinceMap
                      counts={countBy(selected, (r) => r.province)}
                      onClick={(v) => drill({ province: v })}
                    />
                    {distribution("ความบกพร่องทางร่างกาย", "disability")}
                    {distribution("สถานะการศึกษา", "education")}
                    {distribution("ระดับการศึกษา", "level")}
                    {distribution("สถานภาพของพ่อแม่", "parents")}
                    {distribution("เด็กอาศัยอยู่กับใคร", "living", true)}
                    <Chart
                      title="บทบาทผู้ปกครอง / ผู้ดูแล"
                      unit="ความสัมพันธ์เด็ก–ผู้ดูแล"
                      counts={children.reduce((a: Values, c) => {
                        c.guardians.forEach((g) =>
                          (g.roles?.length
                            ? g.roles
                            : ["ยังไม่ได้บันทึก"]
                          ).forEach((v: string) => (a[v] = (a[v] || 0) + 1)),
                        );
                        return a;
                      }, {})}
                      note="หน่วย: ความสัมพันธ์เด็ก–ผู้ดูแล • หลายบทบาทนับได้หลายข้อ"
                      onClick={(v) =>
                        drill({ guardianRole: v, childOnly: true })
                      }
                    />
                    <Chart
                      title="ผู้ร่วมกิจกรรมตามอายุและเพศ"
                      unit="คน-ครั้ง"
                      counts={Object.fromEntries(
                        [
                          "เด็ก · ชาย",
                          "เด็ก · หญิง",
                          "เด็ก · เพศทางเลือก",
                          "18–60 ปี · ชาย",
                          "18–60 ปี · หญิง",
                          "18–60 ปี · เพศทางเลือก",
                          "เกิน 60 ปี · ชาย",
                          "เกิน 60 ปี · หญิง",
                          "เกิน 60 ปี · เพศทางเลือก",
                        ].map((v, i) => [
                          v,
                          activities.reduce(
                            (a, r) => a + Number(r.values["P" + (14 + i)] || 0),
                            0,
                          ),
                        ]),
                      )}
                      note="หน่วย: คน-ครั้ง"
                      onClick={() => drill({}, "activity")}
                    />
                    <Compare
                      title="งบประมาณกิจกรรม"
                      target={activities.reduce(
                        (a, r) => a + Number(r.values.P05 || 0),
                        0,
                      )}
                      actual={activities.reduce(
                        (a, r) => a + Number(r.values.P11 || 0),
                        0,
                      )}
                      unit="บาท"
                      onClick={() => drill({}, "activity")}
                    />
                    <Compare
                      title="ผู้เข้าร่วมกิจกรรม"
                      target={activities.reduce(
                        (a, r) => a + Number(r.values.P07 || 0),
                        0,
                      )}
                      actual={activities.reduce(
                        (a, r) => a + Number(r.values.P13 || 0),
                        0,
                      )}
                      unit="คน-ครั้ง"
                      onClick={() => drill({}, "activity")}
                    />
                  </div>
                </>
              ) : (
                <>
                  {page === "reports" && (
                    <>
                      <div className="report-heading">
                        <div>
                          <h3>
                            รายงาน{" "}
                            {reportKind
                              ? names[reportKind as Kind]
                              : "สรุปภาพรวม"}
                          </h3>
                          <p>
                            ออกวันที่ {new Date().toLocaleDateString("th-TH")} •
                            เงื่อนไข:{" "}
                            {Object.entries(active)
                              .filter(([, v]) => v)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" / ") || "ทั้งหมด"}
                          </p>
                          <p>
                            {selected.length} รายการ • เด็ก {children.length}{" "}
                            คนตามงาน (ไม่ตัดซ้ำข้ามงาน) • ผู้เข้าร่วม{" "}
                            {num(
                              activities.reduce(
                                (a, r) => a + Number(r.values.P13 || 0),
                                0,
                              ),
                            )}{" "}
                            คน-ครั้ง • งบประมาณจริง{" "}
                            {num(
                              activities.reduce(
                                (a, r) => a + Number(r.values.P11 || 0),
                                0,
                              ),
                            )}{" "}
                            บาท
                          </p>
                        </div>
                        <div className="buttons no-print">
                          <button className="outline" onClick={exportCsv}>
                            <Download size={16} />
                            CSV
                          </button>
                          <button
                            className="primary"
                            onClick={() => window.print()}
                          >
                            <Printer size={16} />
                            พิมพ์ / PDF
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {table}
                </>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          ระบบอัยการช่วยเด็ก · สำนักงานอัยการสูงสุด{" "}
          <span>ต้นแบบสำหรับสาธิตการใช้งาน</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast("")}>
            <X size={16} />
          </button>
        </div>
      )}
      {resetDialog && (
        <div className="modal-backdrop">
          <div className="modal">
            <h2>คืนค่าข้อมูลตัวอย่าง</h2>
            <p>
              ข้อมูลทดลองที่เพิ่มหรือแก้ไขจะถูกแทนที่ด้วยข้อมูลตัวอย่างเริ่มต้น
            </p>
            <div className="buttons">
              <button className="outline" onClick={() => setResetDialog(false)}>
                ยกเลิก
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (persist(seed())) {
                    setResetDialog(false);
                    navigate("dashboard");
                    setToast("คืนค่าข้อมูลตัวอย่างแล้ว");
                  }
                }}
              >
                คืนค่าข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Compare({
  title,
  target,
  actual,
  unit,
  onClick,
}: {
  title: string;
  target: number;
  actual: number;
  unit: string;
  onClick: () => void;
}) {
  return (
    <section className="chart">
      <h3>{title}</h3>
      <div className="compare">
        <button onClick={onClick}>
          <span>เป้าหมาย</span>
          <strong>{num(target)}</strong>
          <small>{unit}</small>
        </button>
        <button onClick={onClick}>
          <span>ผลจริง</span>
          <strong>{num(actual)}</strong>
          <small>{unit}</small>
        </button>
      </div>
      <Chart title="เป้าหมายเทียบผลจริง" counts={{ "เป้าหมาย": target, "ผลจริง": actual }} unit={unit} onClick={onClick} />
      <p className="chart-note">
        ผลดำเนินการคิดเป็น {target ? ((actual / target) * 100).toFixed(1) : "0"}
        % ของเป้าหมาย
      </p>
    </section>
  );
}
createRoot(document.getElementById("root")!).render(<App />);

