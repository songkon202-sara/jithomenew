'use strict'

// ─── Supabase ────────────────────────────────────────────────────
const SUPABASE_URL = 'https://drwnsumijarzqezljare.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd25zdW1pamFyenFlemxqYXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDI1NzgsImV4cCI6MjA5NTIxODU3OH0.lv_Uf8rAzBNWuVbL7Q7oxRchWTcvnmmbHLtOiaqFIpQ'
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Constants ───────────────────────────────────────────────────
const TH_MONTHS_S = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const TH_MONTHS_F = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const PAGES = ['dashboard','patients','timeline','overview','visit','admin','members','guide']

const STAFF_CHECKLIST = [
  ['s1','ประเมินอาการทางจิตเวช (สังเกต พูดคุย)'],
  ['s2','ตรวจสอบการรับประทานยาต่อเนื่อง'],
  ['s3','ประเมินความเสี่ยงทำร้ายตนเอง / ผู้อื่น'],
  ['s4','ตรวจวัด V/S (ความดัน, ชีพจร)'],
  ['s5','ประเมินสภาพแวดล้อมบ้านและความปลอดภัย'],
  ['s6','ให้คำแนะนำ / ให้ความรู้ครอบครัว'],
  ['s7','บันทึกข้อมูลในระบบ HIS'],
  ['s8','นัดติดตามครั้งถัดไป'],
]
const AOSOMO_CHECKLIST = [
  ['a1','ผู้ป่วยอยู่บ้าน ไม่หายออกไปจากชุมชน'],
  ['a2','รับประทานยาตามที่แพทย์สั่งทุกวัน'],
  ['a3','ไม่มีอาการก้าวร้าว หรือพฤติกรรมผิดปกติ'],
  ['a4','ครอบครัวดูแลได้ ไม่ทอดทิ้ง'],
  ['a5','มีนัดฉีดยาตามกำหนด (ทราบวันนัด)'],
  ['a6','สภาพบ้านสะอาด ปลอดภัย ไม่มีสิ่งอันตราย'],
]

// ─── State ───────────────────────────────────────────────────────
let hospitalName = 'รพ.สต.สองคอน'
let allPatients  = []
let _visitChecks = []
let _visitType   = 'aosomo'
let _oasScores   = {s1:0, s2:0, s3:0}  // OAS: ต่อตนเอง, ต่อผู้อื่น, ต่อทรัพย์สิน
let _redFlags    = []                   // 5 Red Flags
let _ytAssess    = {ya:null, yati:null, sara:null} // ยาดี-ญาติดี-สารเสพติด
let _assess10    = {}                   // แบบติดตาม 10 ด้าน

const ASSESS10_DOMAINS = [
  {id:'d1',title:'1. ด้านอาการทางจิต',opts:[[1,'ไม่มีอาการ','รู้สึกดี ช่วยตนเองได้ ดำรงชีวิตได้'],[2,'มีบ้าง','พฤติกรรมผิดปกติ ≥10 วัน/เดือน'],[3,'มีมาก','พฤติกรรมผิดปกติ >10 วัน/เดือน']]},
  {id:'d2',title:'2. ด้านการรับยา',opts:[[1,'สม่ำเสมอ','กินยาตามแพทย์สั่งทุกครั้ง'],[2,'ไม่สม่ำเสมอ','กินยาไม่ครบ แต่ยังกินบางเวลา'],[3,'ไม่กินยา','ไม่รับประทานยาเลย']]},
  {id:'d3',title:'3. ด้านผู้ดูแล/ญาติ',opts:[[1,'ดี','มีผู้ดูแลในครอบครัว มีศักยภาพ'],[2,'ปานกลาง','มีผู้ดูแล แต่เป็นคนนอกครอบครัว'],[3,'ปรับปรุง','ไม่มีผู้ดูแล หรือดูแลไม่ได้']]},
  {id:'d4',title:'4. ด้านกิจวัตรประจำวัน',opts:[[1,'ทำได้','ทำด้วยตนเองได้'],[2,'ทำได้บ้าง','ทำได้ แต่ต้องมีคนช่วย'],[3,'ทำไม่ได้','ทำกิจวัตรไม่ได้เลย']]},
  {id:'d5',title:'5. ด้านการประกอบอาชีพ',opts:[[1,'ทำได้','มีอาชีพ ช่วยตนเองด้านอาชีพได้'],[2,'ทำได้บ้าง','ช่วยตนเองได้ แต่ต้องมีคนกระตุ้น'],[3,'ทำไม่ได้','ประกอบอาชีพไม่ได้เลย']]},
  {id:'d6',title:'6. ด้านสัมพันธภาพในครอบครัว',opts:[[1,'ดี','ครอบครัวสื่อสารดี ให้กำลังใจ'],[2,'ปานกลาง','สื่อสารได้ แต่มีข้อขัดแย้งบ้าง'],[3,'ปรับปรุง','ครอบครัวมีปัญหา ดูถูก ผู้ป่วยรู้สึกไม่เป็นส่วนหนึ่ง']]},
  {id:'d7',title:'7. ด้านสิ่งแวดล้อม',opts:[[1,'ดี','มีที่อยู่อาศัยเป็นหลักแหล่ง'],[2,'ปานกลาง','มีที่อยู่ แต่อยู่คนเดียวหรือเป็นครั้งคราว'],[3,'ปรับปรุง','ไม่มีที่อยู่อาศัย ไม่ปลอดภัย']]},
  {id:'d8',title:'8. ด้านการสื่อสาร',opts:[[1,'ดี','ถ่ายทอดความคิดเห็นกับผู้อื่นได้'],[2,'ปานกลาง','สื่อสารได้บ้างครั้งคราว'],[3,'ปรับปรุง','ไม่พูดคุยกับใครเลย']]},
  {id:'d9',title:'9. ด้านการเรียนรู้',opts:[[1,'ดี','บอกครั้งเดียวจำได้ ทำตามได้'],[2,'ปานกลาง','ต้องสอนซ้ำๆ จึงทำได้'],[3,'ปรับปรุง','สอนเท่าไรก็ทำไม่ได้']]},
  {id:'d10',title:'10. ด้านการใช้สารเสพติด (บุหรี่/สุรา/ยาเสพติด)',opts:[[1,'ไม่ใช้','ไม่ใช้สารเสพติดเลย'],[2,'ใช้บ้าง','ใช้บ้าง แต่ไม่ทุกวัน'],[3,'ใช้ประจำ','ใช้ทุกวันหรือแทบทุกวัน']]},
]
let currentUser        = null
let currentRole        = 'viewer'  // admin | staff | aosomo | viewer
let currentDisplayName = ''
let currentVillage     = ''        // หมู่บ้านที่ อสม. รับผิดชอบ
let _previewOrigRole   = null      // เก็บ role จริงของ admin ขณะ preview
let _previewOrigVillage= null

const ROLE_LABEL = {admin:'ผู้ดูแลระบบ',staff:'เจ้าหน้าที่',aosomo:'อสม.',viewer:'ผู้สังเกตการณ์'}
const ROLE_COLOR = {admin:'var(--primary)',staff:'#0d9488',aosomo:'#7c3aed',viewer:'var(--text3)'}
const VIEWER_PAGES = ['overview']
function canDo(action){
  const perms={
    admin:   ['view','record','visit','admin','manage_users'],
    staff:   ['view','record','visit'],
    aosomo:  ['view','visit'],
    viewer:  ['view'],
  }
  return (perms[currentRole]||[]).includes(action)
}

// ─── Helpers ─────────────────────────────────────────────────────
function thDate(d) {
  if (!d) return ''
  const dt = new Date(String(d).slice(0,10) + 'T00:00:00Z')
  return `${dt.getUTCDate()} ${TH_MONTHS_S[dt.getUTCMonth()+1]} ${dt.getUTCFullYear()+543}`
}
function thDateFull(d) {
  if (!d) return ''
  const dt = new Date(String(d).slice(0,10) + 'T00:00:00Z')
  return `${dt.getUTCDate()} ${TH_MONTHS_F[dt.getUTCMonth()+1]} ${dt.getUTCFullYear()+543}`
}
function daysChip(n) {
  n = parseInt(n)
  if (isNaN(n))  return { cls:'upcoming', label:'—' }
  if (n < 0)     return { cls:'overdue',  label:`เกินนัด ${Math.abs(n)} วัน` }
  if (n === 0)   return { cls:'today',    label:'วันนี้' }
  if (n <= 3)    return { cls:'soon',     label:`อีก ${n} วัน` }
  return           { cls:'upcoming',  label:`อีก ${n} วัน` }
}
function groupLabel(g) {
  return {red:'กลุ่มสีแดง',yellow:'กลุ่มสีเหลือง',green:'กลุ่มสีเขียว'}[g] || 'กลุ่มสีเหลือง'
}
function parseInterval(s) {
  if (!s) return 30
  if (/3\s*เดือน/.test(s))   return 90
  if (/1\s*เดือน/.test(s))   return 30
  if (/4\s*สัปดาห์/.test(s)) return 28
  if (/3\s*สัปดาห์/.test(s)) return 21
  if (/2\s*สัปดาห์/.test(s)) return 14
  return 30
}
function parseGroupColor(g) {
  if (!g) return 'yellow'
  if (g.includes('แดง') || g === 'red')     return 'red'
  if (g.includes('เขียว') || g === 'green') return 'green'
  return 'yellow'
}
function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
function todayISO() { return new Date().toISOString().slice(0,10) }
function maskNationalId(id){
  const d=(id||'').replace(/\D/g,'')
  if(!d)return''
  const fmt=n=>`${n.slice(0,1)}-${n.slice(1,5)}-${n.slice(5,10)}-${n.slice(10,12)}-${n.slice(12,13)}`
  if(canDo('admin'))return fmt(d.padEnd(13,'?'))
  return'X-XXXX-XXXXX-XX-X'
}
function formatNationalIdInput(v){
  const d=v.replace(/\D/g,'').slice(0,13)
  if(d.length<=1)return d
  if(d.length<=5)return`${d.slice(0,1)}-${d.slice(1)}`
  if(d.length<=10)return`${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5)}`
  if(d.length<=12)return`${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10)}`
  return`${d.slice(0,1)}-${d.slice(1,5)}-${d.slice(5,10)}-${d.slice(10,12)}-${d.slice(12,13)}`
}

function patientCard(p) {
  const chip = daysChip(p.days_until)
  const over = parseInt(p.days_until) < 0
  const gl   = p.group_label || groupLabel(p.group_color)
  const cls  = `patient-card ${p.group_color}${over?' overdue':''} fade-up`
  const disease = p.disease_code||p.disease_name ? `<div class="pc-note" style="color:#0369a1;background:#f0f9ff">${p.disease_code?`<strong>${esc(p.disease_code)}</strong> `:''}${esc(p.disease_name||'')}</div>` : ''
  const note = p.note ? `<div class="pc-note">${esc(p.note)}</div>` : ''
  return `<div class="${cls}" onclick="openModal(${p.id})" data-id="${p.id}" data-group="${p.group_color}" data-village="${esc(p.village||'')}">
    <div class="pc-top">
      <div>
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-village">${esc(p.village||'')}</div>
      </div>
      <span class="days-chip ${chip.cls}">${chip.label}</span>
    </div>
    <div class="pc-meta">
      <span class="badge ${p.group_color}"><span class="badge-dot"></span>${esc(gl)}</span>
      <span class="pc-date">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        นัด ${thDate(p.next_date)}
      </span>
    </div>
    ${disease}${note}
  </div>`
}

// ─── Data ────────────────────────────────────────────────────────
async function getPatients() {
  let q = sb.from('patient_status').select('*').order('days_until')
  if (currentRole === 'aosomo' && currentVillage) q = q.eq('village', currentVillage)
  const { data, error } = await q
  if (error) { console.error(error); return [] }
  const today = todayISO()
  return (data||[]).map(p => {
    const corrected = { ...p, group_label: groupLabel(p.group_color) }
    // ถ้า last_date อยู่ในอนาคต = วันนัดล่วงหน้า ให้ใช้วันนั้นโดยตรง
    if (corrected.last_date && corrected.last_date > today) {
      corrected.next_date = corrected.last_date
      corrected.days_until = Math.round(
        (new Date(corrected.last_date+'T00:00:00') - new Date(today+'T00:00:00')) / 86400000
      )
    }
    return corrected
  })
}
async function getSettings() {
  const { data } = await sb.from('app_settings').select('setting_key,setting_value')
  const s = {}; for (const r of (data||[])) s[r.setting_key] = r.setting_value
  return s
}
async function getHistory(pid) {
  const { data } = await sb.from('injection_records').select('*').eq('patient_id', pid).order('injection_date', { ascending:false })
  return (data||[]).map(h => ({ ...h, date_th: thDate(h.injection_date) }))
}
async function getVisits(type='all') {
  let q = sb.from('home_visits').select('*').order('visit_date', { ascending:false })
  if (type !== 'all') q = q.eq('visit_type', type)
  const { data } = await q
  return (data||[]).map(v => ({ ...v, visit_date_th: thDate(v.visit_date) }))
}
async function getTrend() {
  const { data } = await sb.from('monthly_trend').select('*').order('month_key').limit(9)
  return data||[]
}

// ─── Router ──────────────────────────────────────────────────────
async function navigate(page) {
  if (!PAGES.includes(page)) page = 'dashboard'
  // viewer เข้าได้เฉพาะหน้า overview
  if(currentRole==='viewer' && !_previewOrigRole && !VIEWER_PAGES.includes(page)) page='overview'
  document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page))
  const titles = {
    dashboard:['JitHome','ระบบติดตามผู้ป่วยจิตเวช'],
    patients: ['ผู้ป่วยทั้งหมด','รายชื่อและสถานะ'],
    timeline: ['ตารางนัดหมาย','เรียงตามวันที่'],
    overview: ['ภาพรวม','สถิติและกราฟ'],
    visit:    ['เยี่ยมบ้าน','บันทึกการเยี่ยม'],
    admin:    ['แอดมิน','จัดการและตั้งค่า'],
    members:  ['จัดการสมาชิก','กำหนดสิทธิ์การเข้าถึง'],
    guide:    ['คู่มือการใช้งาน','ตัวอย่างสิทธิ์แต่ละประเภท'],
  }
  const [t,s] = titles[page]
  document.getElementById('header-title').textContent = t
  document.getElementById('header-sub').textContent   = s
  const el = document.getElementById('page-content')
  el.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text3)">⏳ กำลังโหลด...</div>'
  allPatients = await getPatients()
  if (page==='dashboard') renderDashboard(el)
  else if (page==='patients')  renderPatients(el)
  else if (page==='timeline')  renderTimeline(el)
  else if (page==='overview')  renderOverview(el)
  else if (page==='visit')     renderVisit(el)
  else if (page==='admin')     renderAdmin(el)
  else if (page==='members')   renderMembers(el)
  else if (page==='guide')     renderGuide(el)
  history.replaceState(null,'','#'+page)
  updatePreviewHeader()
  updateUserUI()
}

// ─── Dashboard ───────────────────────────────────────────────────
function renderDashboard(el) {
  const pts = allPatients
  const overdue  = pts.filter(p=>parseInt(p.days_until)<0)
  const todayPts = pts.filter(p=>parseInt(p.days_until)===0)
  const soon7    = pts.filter(p=>{ const d=parseInt(p.days_until); return d>0&&d<=7 })
  const rc=pts.filter(p=>p.group_color==='red').length
  const yc=pts.filter(p=>p.group_color==='yellow').length
  const gc=pts.filter(p=>p.group_color==='green').length
  const now=new Date()
  const days=['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
  const dayStr=`วัน${days[now.getDay()]}ที่ ${thDateFull(todayISO())}`
  el.innerHTML=`<div class="page">
  <div class="today-strip">
    <h2>${dayStr}</h2>
    <p>${esc(hospitalName)}</p>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="pill-btn pill-all" onclick="navigate('patients')">ผู้ป่วยทั้งหมด <span class="pill-count">${pts.length}</span></button>
      <button class="pill-btn pill-overdue" onclick="navigate('patients')">เกินนัด <span class="pill-count">${overdue.length}</span></button>
      <button class="pill-btn pill-today">วันนี้ <span class="pill-count">${todayPts.length}</span></button>
      <button class="pill-btn pill-week" onclick="navigate('patients')">7 วัน <span class="pill-count-g">${soon7.length}</span></button>
    </div>
  </div>
  <div class="stats-grid">
    <div class="stat-card" style="background:var(--red-lt);border:1px solid var(--red-bd)">
      <div class="stat-icon" style="background:var(--red);color:#fff;font-size:16px">⚠️</div>
      <div class="stat-num" style="color:var(--red)">${overdue.length}</div>
      <div class="stat-label" style="color:var(--red)">เกินวันนัด</div>
    </div>
    <div class="stat-card" style="background:var(--yellow-lt);border:1px solid var(--yellow-bd)">
      <div class="stat-icon" style="background:var(--yellow);color:#fff;font-size:16px">🔔</div>
      <div class="stat-num" style="color:var(--yellow)">${soon7.filter(p=>parseInt(p.days_until)<=3).length}</div>
      <div class="stat-label" style="color:var(--yellow)">ภายใน 3 วัน</div>
    </div>
    <div class="stat-card" style="background:var(--red-lt);border:1px solid var(--red-bd)">
      <div class="stat-num" style="color:var(--red)">🔴 ${rc}</div>
      <div class="stat-label">กลุ่มสีแดง</div>
    </div>
    <div class="stat-card" style="background:var(--yellow-lt);border:1px solid var(--yellow-bd)">
      <div class="stat-num" style="color:var(--yellow)">🟡 ${yc}</div>
      <div class="stat-label">กลุ่มสีเหลือง</div>
    </div>
  </div>
  ${overdue.length?`<div class="section-hd"><h3>⚠️ เกินวันนัด (${overdue.length} ราย)</h3></div>${overdue.slice(0,5).map(patientCard).join('')}${overdue.length>5?`<div style="text-align:center;padding:8px"><button onclick="navigate('patients')" class="btn btn-outline" style="font-size:12px;padding:6px 16px">ดูทั้งหมด ${overdue.length} ราย</button></div>`:''}`:``}
  ${todayPts.length?`<div class="section-hd" style="margin-top:8px"><h3>📅 วันนี้ (${todayPts.length} ราย)</h3></div>${todayPts.map(patientCard).join('')}`:``}
  ${soon7.length?`<div class="section-hd" style="margin-top:8px"><h3>🔔 ภายใน 7 วัน (${soon7.length} ราย)</h3></div>${soon7.map(patientCard).join('')}`:``}
  ${!overdue.length&&!todayPts.length&&!soon7.length?`<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><p>ไม่มีการนัดหมายที่ต้องติดตามวันนี้ 🎉</p></div>`:''}
  </div>`
}

// ─── Patients ────────────────────────────────────────────────────
function renderPatients(el) {
  const pts = allPatients
  const villages=[...new Set(pts.map(p=>p.village).filter(Boolean))].sort()
  window._gf='all'; window._vf='all'
  el.innerHTML=`<div class="page">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
    <div><div class="page-title" style="margin-bottom:2px">ผู้ป่วยทั้งหมด</div><div class="page-sub">${pts.length} ราย · ${esc(hospitalName)}</div></div>
    <button onclick="openAddPatient()" style="display:flex;align-items:center;gap:6px;background:var(--primary);color:#fff;border:none;border-radius:10px;padding:9px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;white-space:nowrap"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>เพิ่มผู้ป่วย</button>
  </div>
  <div class="search-wrap">
    <div class="search-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
    <input id="pt-search" placeholder="ค้นหาชื่อ..." oninput="filterPts()" autocomplete="off">
  </div>
  <div class="filter-row">
    <button class="filter-chip active" data-gf="all" onclick="setGF('all')">ทั้งหมด (${pts.length})</button>
    <button class="filter-chip red" data-gf="red" onclick="setGF('red')">🔴 แดง (${pts.filter(p=>p.group_color==='red').length})</button>
    <button class="filter-chip yellow" data-gf="yellow" onclick="setGF('yellow')">🟡 เหลือง (${pts.filter(p=>p.group_color==='yellow').length})</button>
    <button class="filter-chip green" data-gf="green" onclick="setGF('green')">🟢 เขียว (${pts.filter(p=>p.group_color==='green').length})</button>
  </div>
  <div class="filter-row">
    <button class="filter-chip active" data-vf="all" onclick="setVF('all')">ทุกหมู่บ้าน</button>
    ${villages.map(v=>`<button class="filter-chip" data-vf="${esc(v)}" onclick="setVF('${esc(v)}')">${esc(v)}</button>`).join('')}
  </div>
  <div id="pt-list">${pts.map(patientCard).join('')}</div>
  </div>`
}
function filterPts() {
  const q=(document.getElementById('pt-search')?.value||'').toLowerCase()
  const gf=window._gf||'all', vf=window._vf||'all'
  const out=allPatients.filter(p=>{
    if(gf!=='all'&&p.group_color!==gf)return false
    if(vf!=='all'&&p.village!==vf)return false
    if(q&&!(p.name||'').toLowerCase().includes(q))return false
    return true
  })
  const list=document.getElementById('pt-list')
  if(list)list.innerHTML=out.length?out.map(patientCard).join(''):'<div class="empty"><p>ไม่พบผู้ป่วย</p></div>'
}
function setGF(gf){window._gf=gf;document.querySelectorAll('[data-gf]').forEach(e=>e.classList.toggle('active',e.dataset.gf===gf));filterPts()}
function setVF(vf){window._vf=vf;document.querySelectorAll('[data-vf]').forEach(e=>e.classList.toggle('active',e.dataset.vf===vf));filterPts()}

// ─── Timeline ────────────────────────────────────────────────────
function renderTimeline(el) {
  const pts=[...allPatients].sort((a,b)=>new Date(a.next_date||'9999')-new Date(b.next_date||'9999'))
  const today=todayISO(), groups={}
  for(const p of pts){const k=p.next_date||'unknown';if(!groups[k])groups[k]=[];groups[k].push(p)}
  let html=`<div class="page"><div class="page-title">ตารางนัดหมาย</div><div class="page-sub">เรียงตามวันนัดใกล้ที่สุด</div>`
  for(const[date,group]of Object.entries(groups)){
    const past=date<today,isToday=date===today
    const hd=past?`⚠️ ${thDate(date)}`:isToday?`📅 วันนี้ — ${thDate(date)}`:thDate(date)
    html+=`<div class="tl-date-hd${isToday?' today-hd':''}">${hd} · ${group.length} ราย</div>${group.map(patientCard).join('')}`
  }
  if(!pts.length)html+=`<div class="empty"><p>ไม่มีข้อมูลนัดหมาย</p></div>`
  html+=`</div>`
  el.innerHTML=html
}

// ─── Overview ────────────────────────────────────────────────────
async function renderOverview(el) {
  const pts=allPatients,total=pts.length
  const rc=pts.filter(p=>p.group_color==='red').length
  const yc=pts.filter(p=>p.group_color==='yellow').length
  const gc=pts.filter(p=>p.group_color==='green').length
  const overdue=pts.filter(p=>parseInt(p.days_until)<0).length
  const todayC=pts.filter(p=>parseInt(p.days_until)===0).length
  const soon=pts.filter(p=>{const d=parseInt(p.days_until);return d>0&&d<=7}).length
  const ok=pts.filter(p=>parseInt(p.days_until)>7).length
  const [trends, visits] = await Promise.all([getTrend(), getVisits()])

  // Donut
  function donut(r,y,g){
    const tot=Math.max(r+y+g,1),R=40,cx=60,cy=60,circ=2*Math.PI*R
    const rd=r/tot*circ,yd=y/tot*circ,gd=g/tot*circ
    let p=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--border)" stroke-width="16"/>`
    if(r)p+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#dc2626" stroke-width="16" stroke-dasharray="${rd} ${circ}" stroke-dashoffset="0"/>`
    if(y)p+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#d97706" stroke-width="16" stroke-dasharray="${yd} ${circ}" stroke-dashoffset="${-rd}"/>`
    if(g)p+=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#059669" stroke-width="16" stroke-dasharray="${gd} ${circ}" stroke-dashoffset="${-(rd+yd)}"/>`
    return`<svg width="120" height="120" viewBox="0 0 120 120" style="transform:rotate(-90deg)">${p}</svg>`
  }

  // Line chart (injection trends)
  let lineHtml=''
  if(trends.length>=2){
    const W=320,H=130,pL=28,pR=12,pT=12,pB=28,cW=W-pL-pR,cH=H-pT-pB
    const n=trends.length,tots=trends.map(t=>+t.total),maxV=Math.max(...tots,1)
    function pts2(arr){return arr.map((v,i)=>[pL+(n>1?i*(cW/(n-1)):0),pT+cH-(v/maxV)*cH])}
    function svgL(pts,col,bY){
      const d='M'+pts.map(p=>p[0]+','+p[1]).join(' L')
      return`<path d="${d} L${pts[n-1][0]},${bY} L${pts[0][0]},${bY} Z" fill="${col}" fill-opacity="0.08"/>
             <path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round"/>
             ${pts.map(p=>`<circle cx="${p[0]}" cy="${p[1]}" r="3.5" fill="${col}" stroke="#fff" stroke-width="1.5"/>`).join('')}`
    }
    const bY=pT+cH
    const yT=[0,Math.round(maxV/2),maxV]
    lineHtml=`<div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
      <div style="font-weight:700;font-size:14px;margin-bottom:4px">แนวโน้มการนัดหมายรายเดือน</div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;overflow:visible">
        ${yT.map(v=>{const ty=pT+cH-(v/maxV)*cH;return`<line x1="${pL}" y1="${ty}" x2="${W-pR}" y2="${ty}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/><text x="${pL-4}" y="${ty+4}" text-anchor="end" font-size="8" fill="var(--text3)">${v}</text>`}).join('')}
        ${trends.map((t,i)=>{const[,m]=t.month_key.split('-');const x=pL+(n>1?i*(cW/(n-1)):0);return`<text x="${x}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--text3)">${TH_MONTHS_S[+m]}</text>`}).join('')}
        ${svgL(pts2(tots),'#0a7ea4',bY)}
        ${svgL(pts2(trends.map(t=>+t.red_count)),'#dc2626',bY)}
        ${svgL(pts2(trends.map(t=>+t.yellow_count)),'#d97706',bY)}
        ${svgL(pts2(trends.map(t=>+t.green_count)),'#059669',bY)}
      </svg>
    </div>`
  }

  // Visit bar chart (last 6 months)
  const totalStaff=visits.filter(v=>v.visit_type==='staff').length
  const totalAosomo=visits.filter(v=>v.visit_type==='aosomo').length
  let visitChartHtml=''
  if(visits.length){
    // สร้าง map เดือน → {staff, aosomo}
    const monthMap={}
    visits.forEach(v=>{
      const mk=(v.visit_date||'').slice(0,7)
      if(!mk)return
      if(!monthMap[mk])monthMap[mk]={staff:0,aosomo:0}
      monthMap[mk][v.visit_type==='staff'?'staff':'aosomo']++
    })
    const keys=Object.keys(monthMap).sort().slice(-6)
    const maxBar=Math.max(...keys.map(k=>monthMap[k].staff+monthMap[k].aosomo),1)
    const W=320,H=140,pL=28,pR=8,pT=12,pB=28,cW=W-pL-pR,cH=H-pT-pB
    const bw=Math.min(18,cW/(keys.length*2+keys.length+1))
    const gap=bw*0.6
    const groupW=bw*2+gap
    const totalW=keys.length*groupW+(keys.length-1)*gap
    const startX=pL+(cW-totalW)/2
    const yT=[0,Math.round(maxBar/2),maxBar]
    const bars=keys.map((mk,i)=>{
      const{staff:s,aosomo:a}=monthMap[mk]
      const [,m]=mk.split('-')
      const gx=startX+i*(groupW+gap)
      const sh=s?Math.max((s/maxBar)*cH,3):0
      const ah=a?Math.max((a/maxBar)*cH,3):0
      const bY=pT+cH
      return`
        <rect x="${gx}" y="${bY-sh}" width="${bw}" height="${sh}" rx="3" fill="#0d9488"/>
        ${s?`<text x="${gx+bw/2}" y="${bY-sh-3}" text-anchor="middle" font-size="8" fill="#0d9488" font-weight="700">${s}</text>`:''}
        <rect x="${gx+bw+gap}" y="${bY-ah}" width="${bw}" height="${ah}" rx="3" fill="#7c3aed"/>
        ${a?`<text x="${gx+bw+gap+bw/2}" y="${bY-ah-3}" text-anchor="middle" font-size="8" fill="#7c3aed" font-weight="700">${a}</text>`:''}
        <text x="${gx+bw+gap/2}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--text3)">${TH_MONTHS_S[+m]||m}</text>`
    }).join('')
    const yLines=yT.map(v=>{const ty=pT+cH-(v/maxBar)*cH;return`<line x1="${pL}" y1="${ty}" x2="${W-pR}" y2="${ty}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/><text x="${pL-4}" y="${ty+4}" text-anchor="end" font-size="8" fill="var(--text3)">${v}</text>`}).join('')
    visitChartHtml=`<div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;flex-wrap:wrap;gap:8px">
        <div style="font-weight:700;font-size:14px">การเยี่ยมบ้านรายเดือน</div>
        <div style="display:flex;gap:12px">
          <div style="display:flex;align-items:center;gap:5px">
            <div style="width:10px;height:10px;border-radius:2px;background:#0d9488"></div>
            <span style="font-size:11px;color:var(--text3)">เจ้าหน้าที่ <strong style="color:#0d9488">${totalStaff}</strong></span>
          </div>
          <div style="display:flex;align-items:center;gap:5px">
            <div style="width:10px;height:10px;border-radius:2px;background:#7c3aed"></div>
            <span style="font-size:11px;color:var(--text3)">อสม. <strong style="color:#7c3aed">${totalAosomo}</strong></span>
          </div>
        </div>
      </div>
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;overflow:visible">
        ${yLines}${bars}
      </svg>
    </div>`
  } else {
    visitChartHtml=`<div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
      <div style="font-weight:700;font-size:14px;margin-bottom:8px">การเยี่ยมบ้านรายเดือน</div>
      <div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">ยังไม่มีบันทึกการเยี่ยมบ้าน</div>
    </div>`
  }

  el.innerHTML=`<div class="page">
  <div class="page-title">ภาพรวมผู้ป่วย</div>
  <div class="page-sub">สรุปข้อมูล ${esc(hospitalName)} · ${total} ราย</div>
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
    <div style="font-weight:700;font-size:14px;margin-bottom:14px">จำแนกตามกลุ่มสี</div>
    <div style="display:flex;align-items:center;gap:16px">
      <div style="position:relative;flex-shrink:0">
        ${donut(rc,yc,gc)}
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:22px;font-weight:800">${total}</div>
          <div style="font-size:10px;color:var(--text3)">ราย</div>
        </div>
      </div>
      <div style="flex:1">
        ${[['red','สีแดง','var(--red)',rc],['yellow','สีเหลือง','var(--yellow)',yc],['green','สีเขียว','var(--green)',gc]].map(([g,lbl,clr,cnt])=>`
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px"><div style="width:10px;height:10px;border-radius:50%;background:${clr}"></div><span style="font-size:13px;font-weight:500">${lbl}</span></div>
          <span style="font-size:13px;font-weight:700;color:${clr}">${cnt}</span>
        </div>`).join('')}
      </div>
    </div>
  </div>
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
    <div style="font-weight:700;font-size:14px;margin-bottom:12px">สถานะการนัดหมาย</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      ${[['เกินวันนัด',overdue,'var(--red)','var(--red-lt)','⚠️'],['วันนี้',todayC,'var(--primary)','var(--primary-lt)','📅'],['ภายใน 7 วัน',soon,'var(--yellow)','var(--yellow-lt)','🔔'],['ปกติ',ok,'var(--green)','var(--green-lt)','✅']].map(([lbl,cnt,clr,bg,ico])=>`
      <div style="background:${bg};border-radius:10px;padding:12px 14px">
        <div style="font-size:20px">${ico}</div>
        <div style="font-size:22px;font-weight:800;color:${clr};margin-top:4px">${cnt}</div>
        <div style="font-size:11px;color:${clr};font-weight:600;opacity:.8">${lbl}</div>
      </div>`).join('')}
    </div>
  </div>
  ${lineHtml}
  ${visitChartHtml}
  </div>`
}

// ─── Visit ───────────────────────────────────────────────────────
async function renderVisit(el) {
  const visits=await getVisits()
  window._allVisits=visits
  el.innerHTML=`<div class="page">
  <div class="page-title">เยี่ยมบ้าน</div>
  <div class="page-sub">บันทึกการเยี่ยมผู้ป่วยจิตเวช</div>
  <div style="display:flex;gap:10px;margin-bottom:16px">
    <button onclick="openVisitForm('staff')" class="btn btn-primary" style="flex:1">🏥 เยี่ยม (เจ้าหน้าที่)</button>
    <button onclick="openVisitForm('aosomo')" class="btn btn-outline" style="flex:1;border-color:var(--primary);color:var(--primary)">🏡 เยี่ยม (อสม.)</button>
  </div>
  <div class="tab-bar">
    <button class="tab-btn active" onclick="setVTab('all',this)">ทั้งหมด (${visits.length})</button>
    <button class="tab-btn" onclick="setVTab('staff',this)">เจ้าหน้าที่ (${visits.filter(v=>v.visit_type==='staff').length})</button>
    <button class="tab-btn" onclick="setVTab('aosomo',this)">อสม. (${visits.filter(v=>v.visit_type==='aosomo').length})</button>
  </div>
  <div id="visit-list">${renderVisitList(visits)}</div>
  </div>`
}
function renderVisitList(visits){
  if(!visits.length)return'<div class="empty"><p>ไม่มีบันทึกการเยี่ยมบ้าน</p></div>'
  return visits.map(v=>{
    const cl=v.visit_type==='staff'?STAFF_CHECKLIST:AOSOMO_CHECKLIST
    const pct=cl.length?v.score/cl.length:0
    const[bg,clr,lbl]=pct>=0.8?['var(--green-lt)','var(--green)','ปกติดี']:pct>=0.5?['var(--yellow-lt)','var(--yellow)','พอใช้']:['var(--red-lt)','var(--red)','ต้องติดตาม']
    return`<div class="visit-card ${v.visit_type}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div><div style="font-size:15px;font-weight:700">${esc(v.patient_name)}</div><div style="font-size:12px;color:var(--text3)">${esc(v.village||'')} · ${v.visit_date_th}</div></div>
        <span style="background:${bg};color:${clr};padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700">${lbl}</span>
      </div>
      <div style="font-size:12px;color:var(--text2)">${v.visit_type==='staff'?'🏥 เจ้าหน้าที่':'🏡 อสม.'} ${esc(v.visitor||'')}</div>
      ${v.note?`<div style="font-size:12px;color:var(--text3);margin-top:6px;padding-top:6px;border-top:1px solid var(--border)">${esc(v.note)}</div>`:''}
    </div>`
  }).join('')
}
function setVTab(tab,btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active')
  const list=document.getElementById('visit-list')
  if(list){const filtered=tab==='all'?window._allVisits:(window._allVisits||[]).filter(v=>v.visit_type===tab);list.innerHTML=renderVisitList(filtered)}
}

// ─── Admin ───────────────────────────────────────────────────────
function renderMembers(el){
  if(!canDo('admin')){el.innerHTML='<div style="text-align:center;padding:60px 20px;color:var(--text3)">🔒 เฉพาะผู้ดูแลระบบเท่านั้น</div>';return}
  el.innerHTML=`<div class="page">
  <div class="section-hd"><h3>👥 จัดการสมาชิก</h3></div>
  <p style="font-size:13px;color:var(--text3);margin-bottom:20px">กำหนดสิทธิ์การเข้าถึงข้อมูลของสมาชิกแต่ละคน</p>

  <!-- เจ้าหน้าที่ -->
  <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;background:#0d9488;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px">🏥</div>
        <div><div style="font-size:14px;font-weight:700">เจ้าหน้าที่</div><div style="font-size:11px;color:var(--text3)">บันทึกข้อมูล เยี่ยมบ้าน ดูภาพรวม</div></div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="downloadTemplate('staff_dir')" style="display:flex;align-items:center;gap:4px;padding:6px 10px;background:#fff;color:#0d9488;border:1px solid #0d9488;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">
          ⬇️ ดาวน์โหลดตัวอย่าง
        </button>
        <button onclick="document.getElementById('staff-dir-file-input').click()" style="display:flex;align-items:center;gap:4px;padding:6px 12px;background:#0d9488;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">
          📎 นำเข้ารายชื่อ
        </button>
      </div>
      <input type="file" id="staff-dir-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="importStaffDirFile(this)">
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px;padding:6px 10px;background:#f0fdfa;border-radius:6px">
      📋 นำเข้าจาก Excel/CSV — คอลัมน์: <strong>ชื่อ, ตำแหน่ง, เบอร์โทร</strong> (แถวแรกเป็น header)
    </div>
    <div id="group-staff"><div style="color:var(--text3);font-size:12px;padding:8px">⏳ กำลังโหลด...</div></div>
  </div>

  <!-- อสม -->
  <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:8px">
        <div style="width:32px;height:32px;background:#7c3aed;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px">🏡</div>
        <div><div style="font-size:14px;font-weight:700">อสม.</div><div style="font-size:11px;color:var(--text3)">เยี่ยมบ้าน ดูผู้ป่วยในหมู่บ้านตนเอง</div></div>
      </div>
      <div style="display:flex;gap:6px">
        <button onclick="downloadTemplate('aosomo')" style="display:flex;align-items:center;gap:4px;padding:6px 10px;background:#fff;color:#7c3aed;border:1px solid #7c3aed;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">
          ⬇️ ดาวน์โหลดตัวอย่าง
        </button>
        <button onclick="document.getElementById('aosomo-file-input').click()" style="display:flex;align-items:center;gap:4px;padding:6px 12px;background:#7c3aed;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">
          📎 นำเข้ารายชื่อ
        </button>
      </div>
      <input type="file" id="aosomo-file-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="importAosomoFile(this)">
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px;padding:6px 10px;background:#f5f3ff;border-radius:6px">
      📋 นำเข้าจาก Excel/CSV — คอลัมน์: <strong>ชื่อ, หมู่บ้าน, เบอร์โทร</strong> (แถวแรกเป็น header)
    </div>
    <div id="group-aosomo"><div style="color:var(--text3);font-size:12px;padding:8px">⏳ กำลังโหลด...</div></div>
  </div>

  <!-- ผู้สังเกตการณ์ -->
  <div style="background:#fff;border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:16px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <div style="width:32px;height:32px;background:var(--text3);border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:15px">👁️</div>
      <div><div style="font-size:14px;font-weight:700">ผู้สังเกตการณ์</div><div style="font-size:11px;color:var(--text3)">ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไข</div></div>
    </div>
    <div id="group-viewer"><div style="color:var(--text3);font-size:12px;padding:8px">⏳ กำลังโหลด...</div></div>
  </div>
  </div>`
  loadMembersList()
}

function renderGuide(el) {
  const villages=['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต']
  const previewSection = canDo('admin') ? `
  <div style="background:#fff7ed;border:2px solid #fed7aa;border-radius:14px;padding:16px;margin-bottom:20px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
      <div style="font-size:20px">🔍</div>
      <div>
        <div style="font-size:14px;font-weight:800;color:#c2410c">ทดลองดูหน้าเว็บในฐานะสมาชิกแต่ละประเภท</div>
        <div style="font-size:11px;color:#9a3412;margin-top:2px">กดปุ่มเพื่อดูว่าสมาชิกแต่ละประเภทเห็นอะไร — กด <strong>"ออกจากโหมดนี้"</strong> เพื่อกลับ</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px">
      <button onclick="previewAs('staff')" style="background:#f0f9ff;border:2px solid #0a7ea4;border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="font-size:20px;margin-bottom:4px">👨‍⚕️</div>
        <div style="font-size:13px;font-weight:800;color:#0a7ea4">เจ้าหน้าที่</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">บันทึกฉีดยา + เยี่ยมบ้าน</div>
      </button>
      <button onclick="previewAs('aosomo',villages[0])" style="background:#f5f3ff;border:2px solid #7c3aed;border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="font-size:20px;margin-bottom:4px">🏡</div>
        <div style="font-size:13px;font-weight:800;color:#7c3aed">อสม.</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">เยี่ยมบ้าน + หมู่บ้าน</div>
      </button>
      <button onclick="previewAs('viewer')" style="background:#f9fafb;border:2px solid #6b7280;border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="font-size:20px;margin-bottom:4px">👁️</div>
        <div style="font-size:13px;font-weight:800;color:#6b7280">ผู้สังเกตการณ์</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">ภาพรวมอย่างเดียว</div>
      </button>
    </div>
    <div style="background:#f5f3ff;border-radius:10px;padding:10px">
      <div style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:8px">🏡 อสม. — เลือกหมู่บ้านที่ต้องการดู:</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${villages.map(v=>`<button onclick="previewAs('aosomo','${v}')" style="background:#fff;border:1.5px solid #c4b5fd;border-radius:8px;padding:5px 12px;font-size:12px;font-weight:700;color:#7c3aed;cursor:pointer;font-family:'Sarabun',sans-serif">${v}</button>`).join('')}
      </div>
    </div>
  </div>` : ''

  const roles = [
    {
      key:'admin', label:'ผู้ดูแลระบบ', color:'#dc2626', bg:'#fef2f2', border:'#fca5a5', icon:'👑',
      desc:'ควบคุมและจัดการทุกอย่างในระบบ',
      menus:[
        {icon:'🏠',name:'หน้าหลัก',desc:'ดูภาพรวมผู้ป่วยทั้งหมด สถิติ และการแจ้งเตือน'},
        {icon:'👥',name:'ผู้ป่วย',desc:'เพิ่ม แก้ไข ลบผู้ป่วย บันทึกการฉีดยา แก้ไขประวัติ'},
        {icon:'📅',name:'ตารางนัด',desc:'ดูนัดหมายทุกรายการ กรองตามวัน'},
        {icon:'📊',name:'ภาพรวม',desc:'กราฟแนวโน้ม สถิติกลุ่มสี'},
        {icon:'🏡',name:'เยี่ยมบ้าน',desc:'บันทึกและดูประวัติเยี่ยมบ้านทุกหมู่บ้าน'},
        {icon:'⚙️',name:'แอดมิน',desc:'ตั้งค่า LINE, ดูแลระบบ, export ข้อมูล'},
        {icon:'👤',name:'จัดการสมาชิก',desc:'เพิ่ม/ลบ กำหนดสิทธิ์และหมู่บ้านของสมาชิก'},
        {icon:'📖',name:'คู่มือ',desc:'ดูตัวอย่างสิทธิ์การใช้งาน'},
      ]
    },
    {
      key:'staff', label:'เจ้าหน้าที่', color:'#0a7ea4', bg:'#f0f9ff', border:'#bae6fd', icon:'👨‍⚕️',
      desc:'บันทึกข้อมูลและดูแลผู้ป่วยทุกรายการ',
      menus:[
        {icon:'🏠',name:'หน้าหลัก',desc:'ดูภาพรวมผู้ป่วยทั้งหมด สถิติ'},
        {icon:'👥',name:'ผู้ป่วย',desc:'เพิ่ม แก้ไขข้อมูลผู้ป่วย บันทึกการฉีดยา'},
        {icon:'📅',name:'ตารางนัด',desc:'ดูนัดหมายทุกรายการ'},
        {icon:'📊',name:'ภาพรวม',desc:'ดูกราฟสถิติ'},
        {icon:'🏡',name:'เยี่ยมบ้าน',desc:'บันทึกและดูประวัติเยี่ยมบ้าน'},
      ],
      locked:[
        {icon:'⚙️',name:'แอดมิน',desc:'ไม่มีสิทธิ์ตั้งค่าระบบ'},
        {icon:'👤',name:'จัดการสมาชิก',desc:'ไม่มีสิทธิ์จัดการสมาชิก'},
      ]
    },
    {
      key:'aosomo', label:'อสม.', color:'#7c3aed', bg:'#f5f3ff', border:'#c4b5fd', icon:'🏡',
      desc:'ดูและบันทึกเฉพาะผู้ป่วยในหมู่บ้านที่รับผิดชอบ',
      menus:[
        {icon:'🏠',name:'หน้าหลัก',desc:'เห็นเฉพาะผู้ป่วยในหมู่บ้านตัวเอง ไม่เห็นหมู่บ้านอื่น'},
        {icon:'👥',name:'ผู้ป่วย',desc:'ดูรายชื่อและประวัติฉีดยา — กรองเฉพาะหมู่บ้านที่กำหนด'},
        {icon:'📅',name:'ตารางนัด',desc:'ดูนัดหมายของหมู่บ้านตัวเอง'},
        {icon:'🏡',name:'เยี่ยมบ้าน',desc:'บันทึกการเยี่ยมบ้าน ประเมิน 5 ธงแดง รายงาน LINE'},
      ],
      locked:[
        {icon:'📊',name:'ภาพรวม',desc:'ไม่เห็นสถิติรวมทุกหมู่บ้าน'},
        {icon:'⚙️',name:'แอดมิน',desc:'ไม่มีสิทธิ์ตั้งค่าระบบ'},
        {icon:'👤',name:'จัดการสมาชิก',desc:'ไม่มีสิทธิ์จัดการสมาชิก'},
        {icon:'💉',name:'บันทึกฉีดยา',desc:'ดูประวัติได้ แต่ไม่สามารถบันทึกหรือแก้ไขฉีดยา'},
        {icon:'➕',name:'เพิ่มผู้ป่วย',desc:'ไม่มีสิทธิ์เพิ่มหรือลบผู้ป่วย'},
      ]
    },
    {
      key:'viewer', label:'ผู้สังเกตการณ์', color:'#6b7280', bg:'#f9fafb', border:'#e5e7eb', icon:'👁️',
      desc:'ดูข้อมูลได้อย่างเดียว ไม่สามารถแก้ไขหรือบันทึก',
      menus:[
        {icon:'🏠',name:'หน้าหลัก',desc:'ดูภาพรวมผู้ป่วย'},
        {icon:'👥',name:'ผู้ป่วย',desc:'ดูรายชื่อและประวัติ — ดูอย่างเดียว'},
        {icon:'📅',name:'ตารางนัด',desc:'ดูตารางนัดหมาย'},
        {icon:'📊',name:'ภาพรวม',desc:'ดูกราฟสถิติ'},
      ],
      locked:[
        {icon:'✏️',name:'บันทึกฉีดยา',desc:'ไม่มีสิทธิ์บันทึกหรือแก้ไข'},
        {icon:'🏡',name:'เยี่ยมบ้าน',desc:'ไม่มีสิทธิ์บันทึกการเยี่ยม'},
        {icon:'⚙️',name:'แอดมิน',desc:'ไม่มีสิทธิ์ตั้งค่าระบบ'},
        {icon:'👤',name:'จัดการสมาชิก',desc:'ไม่มีสิทธิ์จัดการสมาชิก'},
      ]
    }
  ]

  const roleColors = {admin:'#dc2626',staff:'#0a7ea4',aosomo:'#7c3aed',viewer:'#6b7280'}

  el.innerHTML = `
  <div style="max-width:700px;margin:0 auto;padding:8px 0">
    ${previewSection}
    <div style="text-align:center;margin-bottom:20px">
      <div style="font-size:28px;margin-bottom:6px">📖</div>
      <div style="font-size:15px;font-weight:700;color:var(--text1)">สิทธิ์การใช้งานแต่ละประเภทสมาชิก</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">ตัวอย่างเมนูและฟังก์ชันที่สมาชิกแต่ละประเภทเข้าถึงได้</div>
    </div>
    ${roles.map(r=>`
    <div style="background:${r.bg};border:1.5px solid ${r.border};border-radius:14px;padding:16px;margin-bottom:14px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
        <div style="width:40px;height:40px;background:${r.color};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${r.icon}</div>
        <div>
          <div style="font-size:15px;font-weight:800;color:${r.color}">${r.label}</div>
          <div style="font-size:12px;color:var(--text2);margin-top:1px">${r.desc}</div>
        </div>
      </div>
      <div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:6px;letter-spacing:.5px">✅ เข้าถึงได้</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:${r.locked?'10px':'0'}">
        ${r.menus.map(m=>`
        <div style="background:#fff;border-radius:8px;padding:7px 10px;display:flex;align-items:flex-start;gap:7px">
          <div style="font-size:15px;line-height:1.2;flex-shrink:0">${m.icon}</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:var(--text1)">${m.name}</div>
            <div style="font-size:10px;color:var(--text3);margin-top:1px;line-height:1.3">${m.desc}</div>
          </div>
        </div>`).join('')}
      </div>
      ${r.locked?`
      <div style="font-size:11px;font-weight:700;color:#9ca3af;margin-bottom:6px;letter-spacing:.5px">🔒 ไม่มีสิทธิ์</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:5px">
        ${r.locked.map(m=>`
        <div style="background:rgba(0,0,0,.04);border-radius:8px;padding:7px 10px;display:flex;align-items:flex-start;gap:7px;opacity:.7">
          <div style="font-size:15px;line-height:1.2;flex-shrink:0">${m.icon}</div>
          <div>
            <div style="font-size:12px;font-weight:700;color:#9ca3af;text-decoration:line-through">${m.name}</div>
            <div style="font-size:10px;color:#9ca3af;margin-top:1px;line-height:1.3">${m.desc}</div>
          </div>
        </div>`).join('')}
      </div>`:''
      }
    </div>`).join('')}
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-top:4px;font-size:11px;color:var(--text3);line-height:1.7">
      <strong style="color:var(--text2)">หมายเหตุ:</strong> แอดมินสามารถเปลี่ยนประเภทสมาชิกและกำหนดหมู่บ้านได้ที่เมนู <strong>จัดการสมาชิก</strong>
    </div>
  </div>`
}

// ─── Preview Mode ─────────────────────────────────────────────────
function previewAs(role, village){
  if(!canDo('admin')){alert('เฉพาะแอดมินเท่านั้น');return}
  _previewOrigRole    = currentRole
  _previewOrigVillage = currentVillage
  currentRole    = role
  currentVillage = village || ''
  navigate('dashboard')
}

function exitPreview(){
  currentRole    = _previewOrigRole
  currentVillage = _previewOrigVillage
  _previewOrigRole    = null
  _previewOrigVillage = null
  updatePreviewHeader()
  navigate('admin')
}

function updatePreviewHeader(){
  const header = document.querySelector('.app-header')
  if(!header) return
  const roleColor = {admin:'#dc2626',staff:'#0a7ea4',aosomo:'#7c3aed',viewer:'#6b7280'}
  const roleIcon  = {admin:'👑',staff:'👨‍⚕️',aosomo:'🏡',viewer:'👁️'}
  const roleLabel = {admin:'ผู้ดูแลระบบ',staff:'เจ้าหน้าที่',aosomo:'อสม.',viewer:'ผู้สังเกตการณ์'}
  if(_previewOrigRole){
    header.style.background = roleColor[currentRole]
    header.style.color = '#fff'
    const sub = document.getElementById('header-sub')
    const rightEl = document.querySelector('.header-right')
    if(sub){
      sub.style.color='rgba(255,255,255,.8)'
      sub.textContent=`👁️ โหมดดูตัวอย่าง: ${roleIcon[currentRole]} ${roleLabel[currentRole]}${currentVillage?' ('+currentVillage+')':''}`
    }
    if(rightEl){
      rightEl.innerHTML=`<button onclick="exitPreview()" style="background:rgba(255,255,255,.25);border:1px solid rgba(255,255,255,.5);color:#fff;border-radius:8px;padding:6px 14px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">✕ ออกจากโหมดนี้</button>`
    }
    const titleEl = document.getElementById('header-title')
    if(titleEl) titleEl.style.color='#fff'
  } else {
    header.style.background = ''
    header.style.color = ''
    const titleEl = document.getElementById('header-title')
    if(titleEl) titleEl.style.color=''
    const sub = document.getElementById('header-sub')
    if(sub){ sub.style.color=''; sub.textContent='' }
    const rightEl = document.querySelector('.header-right')
    if(rightEl) rightEl.innerHTML=`
      <div class="notif-btn" onclick="navigate('dashboard')">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        <div class="notif-badge" id="notif-badge" style="display:none">0</div>
      </div>
      <div class="avatar">อส</div>
      <button onclick="logoutUser()" class="header-logout-btn" title="ออกจากระบบ">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        <span>ออก</span>
      </button>`
  }
}

async function renderAdmin(el) {
  const settings=await getSettings()
  hospitalName=settings.hospital_name||hospitalName
  const pts=allPatients
  const rc=pts.filter(p=>p.group_color==='red').length
  const yc=pts.filter(p=>p.group_color==='yellow').length
  const gc=pts.filter(p=>p.group_color==='green').length
  const over=pts.filter(p=>parseInt(p.days_until)<0).length
  const todayC=pts.filter(p=>parseInt(p.days_until)===0).length
  const nameOpts=pts.map(p=>`<option value="${esc(p.name)}">`).join('')
  const villages=['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต']
  el.innerHTML=`<div class="page">
  <div class="page-title">แอดมิน</div>
  <div class="page-sub">จัดการข้อมูลและตั้งค่าระบบ</div>
  <div class="form-section">
    <h3>👁️ ดูตัวอย่างการแสดงผลตามสิทธิ์</h3>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px">เลือกประเภทสมาชิกเพื่อดูว่าเขาจะเห็นหน้าเว็บแบบไหน — กดปุ่ม <strong>ออกจากโหมดนี้</strong> เพื่อกลับสิทธิ์แอดมิน</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
      <button onclick="previewAs('staff')" style="background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="font-size:18px;margin-bottom:4px">👨‍⚕️</div>
        <div style="font-size:13px;font-weight:700;color:#0a7ea4">เจ้าหน้าที่</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">บันทึกฉีดยา เยี่ยมบ้าน</div>
      </button>
      <button onclick="previewAs('aosomo',villages[0])" style="background:#f5f3ff;border:1.5px solid #c4b5fd;border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="font-size:18px;margin-bottom:4px">🏡</div>
        <div style="font-size:13px;font-weight:700;color:#7c3aed">อสม.</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">เยี่ยมบ้าน + หมู่บ้าน</div>
      </button>
      <button onclick="previewAs('viewer')" style="background:#f9fafb;border:1.5px solid #e5e7eb;border-radius:10px;padding:12px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="font-size:18px;margin-bottom:4px">👁️</div>
        <div style="font-size:13px;font-weight:700;color:#6b7280">ผู้สังเกตการณ์</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">ภาพรวมอย่างเดียว</div>
      </button>
    </div>
    <div style="margin-top:8px">
      <div style="font-size:12px;font-weight:700;color:#7c3aed;margin-bottom:6px">🏡 อสม. — เลือกหมู่บ้าน:</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${villages.map(v=>`<button onclick="previewAs('aosomo','${v}')" style="background:#f5f3ff;border:1.5px solid #c4b5fd;border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;color:#7c3aed;cursor:pointer;font-family:'Sarabun',sans-serif">${v}</button>`).join('')}
      </div>
    </div>
  </div>
  <div class="form-section">
    <h3>📊 สรุปภาพรวม</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      ${[['ทั้งหมด',pts.length,'var(--primary)'],['เกินนัด',over,'var(--red)'],['วันนี้',todayC,'#0d9488']].map(([l,n,c])=>`<div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px"><div style="font-size:22px;font-weight:700;color:${c}">${n}</div><div style="font-size:11px;color:var(--text3);margin-top:2px">${l}</div></div>`).join('')}
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      ${[['สีแดง',rc,'var(--red)'],['สีเหลือง',yc,'var(--yellow)'],['สีเขียว',gc,'var(--green)']].map(([l,n,c])=>`<div style="flex:1;background:var(--bg);border-radius:8px;padding:8px;text-align:center"><div style="width:10px;height:10px;border-radius:50%;background:${c};margin:0 auto 4px"></div><div style="font-size:16px;font-weight:700;color:${c}">${n}</div><div style="font-size:10px;color:var(--text3)">${l}</div></div>`).join('')}
    </div>
  </div>
  <div class="form-section">
    <h3>💉 บันทึกนัดฉีดยา</h3>
    <div class="form-group"><label>ชื่อ-นามสกุล</label><input list="adm-names" id="adm-name" placeholder="พิมพ์หรือเลือกชื่อ" autocomplete="off"><datalist id="adm-names">${nameOpts}</datalist></div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label>หมู่บ้าน</label><select id="adm-village">${['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต'].map(v=>`<option>${v}</option>`).join('')}</select></div>
      <div class="form-group"><label>กลุ่มสี</label><select id="adm-group"><option value="สีแดง">สีแดง</option><option value="สีเหลือง" selected>สีเหลือง</option><option value="สีเขียว">สีเขียว</option></select></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
      <div class="form-group"><label>วันที่ฉีดยา</label><input type="date" id="adm-date" value="${todayISO()}"></div>
      <div class="form-group"><label>รอบนัดต่อไป</label><select id="adm-interval"><option>2 สัปดาห์</option><option>3 สัปดาห์</option><option>4 สัปดาห์</option><option selected>1 เดือน</option><option>3 เดือน</option></select></div>
    </div>
    <div class="form-group">
      <label>หมายเหตุ</label>
      <textarea id="adm-note" rows="2" style="resize:vertical;min-height:60px;font-family:'Sarabun',sans-serif"></textarea>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
        ${['ฉีดยา Invega 100 mg','DEPO-A ฉีดทุก 3 เดือน','FLUPENTIXOL 40MG/2ML','อาการคงที่','ไม่มา'].map(p=>`<button type="button" onclick="appendNote('${esc(p)}')" style="font-size:11px;padding:3px 9px;border-radius:20px;border:1px solid var(--border);background:var(--bg);color:var(--text2);cursor:pointer;font-family:'Sarabun',sans-serif;font-weight:600">+ ${p}</button>`).join('')}
      </div>
    </div>
    <button class="btn btn-primary btn-block" id="adm-btn" onclick="saveAdminRecord()">บันทึกนัดหมาย</button>
  </div>
  <div class="form-section">
    <h3>⚙️ ตั้งค่า</h3>
    <div class="form-group"><label>ชื่อโรงพยาบาล</label><input id="s-hospital" value="${esc(settings.hospital_name||hospitalName)}"></div>
    <button class="btn btn-primary" style="width:auto;padding:9px 20px" id="settings-btn" onclick="saveSettings()">บันทึกการตั้งค่า</button>
  </div>
  <div class="form-section">
    <h3>🔗 เชื่อมต่อข้อมูล</h3>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px;margin-top:-4px">นำเข้า/ส่งออก และเชื่อมข้อมูลกับระบบภายนอก</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <button onclick="exportCSV()" style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:10px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:18px">📥</span><span style="font-size:13px;font-weight:700;color:#059669">ส่งออกข้อมูล</span></div>
        <div style="font-size:10px;color:var(--text3)">CSV / JSON</div>
      </button>
      <button onclick="exportJSON()" style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;background:var(--primary-lt);border:1.5px solid rgba(10,126,164,.25);border-radius:10px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:18px">📦</span><span style="font-size:13px;font-weight:700;color:var(--primary)">JSON Export</span></div>
        <div style="font-size:10px;color:var(--text3)">ข้อมูลแบบ JSON</div>
      </button>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0a7ea4;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px">🧑‍⚕️</div>
          <div><div style="font-size:13px;font-weight:700">นำเข้าผู้ป่วย</div><div style="font-size:11px;color:var(--text3)">ชื่อ, หมู่บ้าน, หมายเหตุ, เลขบัตร, รหัสโรค, ชื่อโรค</div></div>
        </div>
        <div style="display:flex;gap:6px">
          <button onclick="downloadTemplate('patient')" style="padding:5px 10px;background:#fff;color:#0a7ea4;border:1px solid #0a7ea4;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">⬇️ ตัวอย่าง</button>
          <button onclick="document.getElementById('patient-import-input').click()" style="padding:5px 10px;background:#0a7ea4;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">📎 นำเข้า</button>
        </div>
      </div>
      <input type="file" id="patient-import-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="importPatientFile(this)">
    </div>
    <div style="background:#fefce8;border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid #fde68a">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#d97706;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">H</div>
          <div><div style="font-size:13px;font-weight:700">นำเข้าจาก HOSxP / JHCIS</div><div style="font-size:11px;color:var(--text3)">ชื่อ, สกุล, เลขบัตร, ที่อยู่, รหัสโรค, สีกลุ่ม</div></div>
        </div>
        <button onclick="document.getElementById('hospital-import-input').click()" style="padding:5px 12px;background:#d97706;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">📎 นำเข้า</button>
      </div>
      <div style="font-size:11px;color:#92400e;background:#fff;border-radius:6px;padding:6px 10px">คอลัมน์: <strong>C=ชื่อ, D=สกุล, E=เลขบัตร, G=เลขที่(หมู่), H=namemooban, I=ตำบล, J=อำเภอ, K=จังหวัด, L=รหัสโรค, M=ชื่อโรค</strong></div>
      <input type="file" id="hospital-import-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="importHospitalFile(this)">
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0f9d58;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">G</div>
          <div><div style="font-size:13px;font-weight:700">Google Sheets</div><div style="font-size:11px;color:var(--text3)">ซิงค์อัตโนมัติ</div></div>
        </div>
        <span style="font-size:10px;background:var(--green-lt);color:var(--green);padding:2px 8px;border-radius:20px;font-weight:700">● Active</span>
      </div>
      <input type="text" id="sheets-url-input" value="${esc(settings.sheets_url||'')}" placeholder="https://docs.google.com/spreadsheets/d/..." style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace;margin-bottom:8px">
      <div style="display:flex;gap:8px">
        <button id="sheets-save-btn" onclick="saveSheetURL()" style="flex:1;padding:7px;background:#0f9d58;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">💾 บันทึก URL</button>
        <button id="sheets-import-btn" onclick="importFromSheets()" style="flex:1;padding:7px;background:var(--primary);color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">📥 นำเข้าข้อมูล</button>
      </div>
      <div id="sheets-status" style="font-size:11px;color:var(--text3);margin-top:6px;min-height:16px"></div>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0a7ea4;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px">H</div>
          <div><div style="font-size:13px;font-weight:700">HOSxP / JHCIS</div><div style="font-size:11px;color:var(--text3)">ระบบฐานข้อมูล รพ.สต.</div></div>
        </div>
        <label class="toggle"><input type="checkbox" ${settings.hosxp_enabled==='1'?'checked':''} onchange="toggleSetting('hosxp_enabled',this.checked)"><span class="toggle-slider"></span></label>
      </div>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#06c755;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">L</div>
          <div><div style="font-size:13px;font-weight:700">LINE Notify / OA</div><div style="font-size:11px;color:var(--text3)">แจ้งเตือนผ่าน LINE กลุ่ม อสม.</div></div>
        </div>
        <label class="toggle"><input type="checkbox" ${settings.line_enabled==='1'?'checked':''} onchange="toggleSetting('line_enabled',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <input id="line-token-input" type="text" value="${esc(settings.line_token||'')}" placeholder="LINE Channel Access Token" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace;margin-bottom:6px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">LINE Group ID</div>
      <input id="line-groupid-input" type="text" value="${esc(settings.line_group_id||'')}" placeholder="Cxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace;margin-bottom:8px">
      <div style="display:flex;gap:8px">
        <button onclick="saveLineSettings()" id="line-save-btn" style="flex:1;padding:7px;background:#06c755;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">💾 บันทึก</button>
        <button onclick="testLine()" id="line-test-btn" style="flex:1;padding:7px;background:#fff;color:#06c755;border:1.5px solid #06c755;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">📨 ทดสอบส่ง</button>
      </div>
      <div id="line-status" style="font-size:11px;margin-top:6px;min-height:16px"></div>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0088cc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">T</div>
          <div><div style="font-size:13px;font-weight:700">Telegram Bot</div><div style="font-size:11px;color:var(--text3)">${esc(settings.telegram_bot||'@JitHomeBot')} · กลุ่มแจ้งเตือน</div></div>
        </div>
        <label class="toggle"><input type="checkbox" ${settings.telegram_enabled==='1'?'checked':''} onchange="toggleSetting('telegram_enabled',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Chat ID</div>
      <input id="telegram-chatid-input" type="text" value="${esc(settings.telegram_chatid||'')}" placeholder="-1001234567890" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace;margin-bottom:6px">
      <div style="font-size:11px;color:var(--text3);margin-bottom:4px">Bot Token <span style="color:var(--red)">*</span> <a href="https://t.me/BotFather" target="_blank" style="color:var(--primary);font-size:10px">สร้าง Bot ที่ @BotFather</a></div>
      <input id="telegram-token-input" type="text" value="${esc(settings.telegram_token||'')}" placeholder="123456789:AABBCCDDaabbccddeeff" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace;margin-bottom:8px">
      <div style="display:flex;gap:8px">
        <button onclick="saveTelegramSettings()" id="tg-save-btn" style="flex:1;padding:7px;background:#0088cc;color:#fff;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">💾 บันทึก</button>
        <button onclick="testTelegram()" id="tg-test-btn" style="flex:1;padding:7px;background:#fff;color:#0088cc;border:1.5px solid #0088cc;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">📨 ทดสอบส่ง</button>
      </div>
      <div id="tg-status" style="font-size:11px;margin-top:6px;min-height:16px"></div>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0ea5e9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">☁️</div>
          <div><div style="font-size:13px;font-weight:700">Cloud Backup</div><div style="font-size:11px;color:var(--text3)">สำรองข้อมูลอัตโนมัติทุก 24 ชม.</div></div>
        </div>
        <label class="toggle"><input type="checkbox" ${settings.cloud_backup==='1'?'checked':''} onchange="toggleSetting('cloud_backup',this.checked)"><span class="toggle-slider"></span></label>
      </div>
    </div>
  </div>
  ${canDo('manage_users')?`
  <div class="form-section">
    <h3>🏡 สร้างบัญชีสำหรับ อสม.</h3>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px;margin-top:-4px">สร้างบัญชีให้ อสม. ที่ไม่มีอีเมล — ใช้เบอร์โทรแทน</div>
    <div class="form-group"><label>ชื่อ-นามสกุล อสม. *</label><input type="text" id="ca-name" placeholder="เช่น นางสมศรี ใจดี" style="width:100%;box-sizing:border-box"></div>
    <div class="form-group"><label>เบอร์โทรศัพท์ * (ใช้เป็นชื่อผู้ใช้และรหัสผ่าน)</label><input type="tel" id="ca-phone" placeholder="0812345678" maxlength="10" inputmode="numeric" style="width:100%;box-sizing:border-box"></div>
    <div class="form-group"><label>หมู่บ้าน</label>
      <select id="ca-village" style="width:100%">
        ${villages.map(v=>`<option>${v}</option>`).join('')}
      </select>
    </div>
    <div id="ca-result" style="font-size:12px;min-height:16px;margin-bottom:8px"></div>
    <button class="btn btn-primary" id="ca-btn" onclick="createAosomoAccount()" style="background:#7c3aed;border-color:#7c3aed">🏡 สร้างบัญชี อสม.</button>
  </div>
  <div class="form-section">
    <h3>👥 จัดการสมาชิก</h3>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px;margin-top:-4px">กำหนดสิทธิ์การเข้าถึงของสมาชิกแต่ละคน</div>
    <div id="members-list"><div style="text-align:center;padding:20px;color:var(--text3)">⏳ กำลังโหลด...</div></div>
  </div>`:''}
  </div>`

  if(canDo('manage_users'))loadMembersList()
}

async function createAosomoAccount(){
  const name=(document.getElementById('ca-name')?.value||'').trim()
  const phone=(document.getElementById('ca-phone')?.value||'').replace(/\D/g,'')
  const village=document.getElementById('ca-village')?.value||''
  const result=document.getElementById('ca-result')
  const btn=document.getElementById('ca-btn')
  if(!name){result.style.color='var(--red)';result.textContent='❌ กรุณากรอกชื่อ';return}
  if(phone.length<9){result.style.color='var(--red)';result.textContent='❌ เบอร์โทรไม่ถูกต้อง';return}
  const email=phone+'@jithome.local'
  const password=phone
  btn.disabled=true;btn.textContent='กำลังสร้างบัญชี...'
  result.style.color='var(--text3)';result.textContent=''
  try{
    // ใช้ temp client เพื่อไม่กระทบ session ของแอดมิน
    const tmp=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}})
    const{data,error}=await tmp.auth.signUp({email,password})
    if(error){
      if(error.message?.includes('already registered')){result.style.color='var(--red)';result.textContent='❌ เบอร์โทรนี้มีบัญชีอยู่แล้ว'}
      else{result.style.color='var(--red)';result.textContent='❌ '+error.message}
      btn.disabled=false;btn.textContent='🏡 สร้างบัญชี อสม.';return
    }
    const uid=data?.user?.id
    if(uid){
      // สร้าง profile ทันที ไม่ต้องรอ login ครั้งแรก
      await sb.from('user_profiles').upsert({
        id:uid,email,display_name:name,role:'aosomo',village,
        last_login:new Date().toISOString()
      },{onConflict:'id'})
    }
    // แสดงข้อมูลล็อกอินให้แอดมินส่งต่อ
    result.innerHTML=`<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:10px;margin-top:4px">
      <div style="font-weight:700;color:#166534;margin-bottom:6px">✅ สร้างบัญชีสำเร็จ! แจ้ง อสม. ดังนี้:</div>
      <div style="font-size:12px;line-height:1.8">
        👤 ชื่อผู้ใช้: <strong>${esc(email)}</strong><br>
        🔑 รหัสผ่าน: <strong>${esc(phone)}</strong><br>
        🏡 หมู่บ้าน: <strong>${esc(village)}</strong>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:6px">💡 แนะนำให้เปลี่ยนรหัสผ่านหลังเข้าสู่ระบบครั้งแรก</div>
    </div>`
    document.getElementById('ca-name').value=''
    document.getElementById('ca-phone').value=''
    loadMembersList()
  }catch(e){result.style.color='var(--red)';result.textContent='❌ '+e.message}
  btn.disabled=false;btn.textContent='🏡 สร้างบัญชี อสม.'
}

function memberCard(p,showVillage=false){
  const isSelf=p.id===currentUser?.id
  const canEdit=canDo('admin')||isSelf
  return `
  <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:8px;border:1px solid var(--border)">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
      <div style="display:flex;align-items:center;gap:10px;min-width:0;flex:1">
        <div style="width:34px;height:34px;border-radius:50%;background:${ROLE_COLOR[p.role]||'var(--primary)'};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">${(p.email||'?').slice(0,2).toUpperCase()}</div>
        <div style="min-width:0;flex:1">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="font-size:13px;font-weight:700">${esc(p.display_name||p.email)}</div>
            ${canEdit?`<button onclick="editMemberName('${p.id}','${esc(p.display_name||'')}')" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:1px 4px;font-size:12px" title="แก้ไขชื่อ">✏️</button>`:''}
          </div>
          <div style="font-size:11px;color:var(--text3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.email)}${p.last_login?` · เข้าล่าสุด ${thDate(p.last_login?.slice(0,10))}`:''}</div>
        </div>
      </div>
      ${isSelf?`<span style="font-size:10px;color:var(--text3);padding:2px 8px;border-radius:20px;border:1px solid var(--border)">(คุณ)</span>`:`
      <select onchange="changeMemberRole('${p.id}',this.value)" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:#fff;font-family:'Sarabun',sans-serif">
        ${['admin','staff','aosomo','viewer'].map(r=>`<option value="${r}"${p.role===r?' selected':''}>${ROLE_LABEL[r]}</option>`).join('')}
      </select>`}
    </div>
    ${showVillage&&!isSelf?`
    <div style="margin-top:8px;display:flex;align-items:center;gap:6px;padding-top:8px;border-top:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text3);white-space:nowrap">🏡 หมู่บ้าน:</span>
      <select onchange="changeMemberVillage('${p.id}',this.value)" style="font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:#fff;font-family:'Sarabun',sans-serif;flex:1">
        <option value="">— ยังไม่กำหนด —</option>
        ${['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต'].map(v=>`<option value="${v}"${p.village===v?' selected':''}>${v}</option>`).join('')}
      </select>
    </div>`:''}
  </div>`
}
async function editMemberName(userId, currentName){
  const newName=prompt('แก้ไขชื่อ-นามสกุล (แสดงในระบบ):',currentName)
  if(newName===null)return
  const trimmed=newName.trim()
  if(!trimmed){alert('กรุณากรอกชื่อ');return}
  const{error}=await sb.from('user_profiles').update({display_name:trimmed}).eq('id',userId)
  if(error){alert('❌ บันทึกไม่สำเร็จ: '+error.message);return}
  if(userId===currentUser?.id){
    currentDisplayName=trimmed
    updateUserUI()
  }
  loadMembersList()
}

function staffDirectoryCard(s){
  return `
  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:6px;border:1px solid #ccfbf1;display:flex;align-items:center;justify-content:space-between;gap:8px">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <div style="width:32px;height:32px;border-radius:50%;background:#ccfbf1;color:#0d9488;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${esc((s.name||'?').slice(0,2))}</div>
      <div>
        <div style="font-size:13px;font-weight:700">${esc(s.name)}</div>
        <div style="font-size:11px;color:var(--text3)">${esc(s.position||'—')}${s.phone?` · ${esc(s.phone)}`:''}</div>
      </div>
    </div>
    <button onclick="deleteStaffDirectory(${s.id})" style="background:none;border:none;cursor:pointer;color:#fca5a5;padding:4px;font-size:15px" title="ลบ">🗑️</button>
  </div>`
}

function aosomoDirectoryCard(a){
  return `
  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:6px;border:1px solid #ede9fe;display:flex;align-items:center;justify-content:space-between;gap:8px">
    <div style="display:flex;align-items:center;gap:10px;min-width:0">
      <div style="width:32px;height:32px;border-radius:50%;background:#ede9fe;color:#7c3aed;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:12px;flex-shrink:0">${esc((a.name||'?').slice(0,2))}</div>
      <div>
        <div style="font-size:13px;font-weight:700">${esc(a.name)}</div>
        <div style="font-size:11px;color:var(--text3)">${esc(a.village||'—')}${a.phone?` · ${esc(a.phone)}`:''}</div>
      </div>
    </div>
    <button onclick="deleteAosomoDirectory(${a.id})" style="background:none;border:none;cursor:pointer;color:#fca5a5;padding:4px;font-size:15px" title="ลบ">🗑️</button>
  </div>`
}

async function loadMembersList(){
  const[{data:profiles},{data:aosomoDir},{data:staffDir}]=await Promise.all([
    sb.from('user_profiles').select('*').order('created_at'),
    sb.from('aosomo_directory').select('*').order('village'),
    sb.from('staff_directory').select('*').order('name')
  ])
  const all=profiles||[]
  const staffEl=document.getElementById('group-staff')
  const aosomoEl=document.getElementById('group-aosomo')
  const viewerEl=document.getElementById('group-viewer')
  if(!staffEl)return

  const staff=all.filter(p=>p.role==='staff'||p.role==='admin')
  const aosomo=all.filter(p=>p.role==='aosomo')
  const viewer=all.filter(p=>p.role==='viewer')

  const staffDirHtml=(staffDir||[]).length?`
    <div style="font-size:11px;font-weight:700;color:#0d9488;margin:12px 0 6px;padding-top:10px;border-top:2px dashed #ccfbf1">📋 รายชื่อเจ้าหน้าที่ที่นำเข้า (${staffDir.length} คน)</div>
    ${(staffDir||[]).map(staffDirectoryCard).join('')}`:''
  staffEl.innerHTML=(staff.length?staff.map(p=>memberCard(p,false)).join(''):'')+staffDirHtml||`<div style="color:var(--text3);font-size:12px;padding:8px 0">ยังไม่มีเจ้าหน้าที่</div>`

  const dirHtml=(aosomoDir||[]).length?`
    <div style="font-size:11px;font-weight:700;color:#7c3aed;margin:12px 0 6px;padding-top:10px;border-top:2px dashed #ede9fe">📋 รายชื่อ อสม. ที่นำเข้า (${aosomoDir.length} คน)</div>
    ${aosomoDir.map(aosomoDirectoryCard).join('')}`:''
  aosomoEl.innerHTML=(aosomo.length?aosomo.map(p=>memberCard(p,true)).join(''):'')+dirHtml||`<div style="color:var(--text3);font-size:12px;padding:8px 0">ยังไม่มีรายชื่อ</div>`

  viewerEl.innerHTML=viewer.length?viewer.map(p=>memberCard(p,false)).join(''):`<div style="color:var(--text3);font-size:12px;padding:8px 0">ยังไม่มีผู้สังเกตการณ์</div>`
}

async function importAosomoFile(input){
  const file=input.files[0];if(!file)return;input.value=''
  try{
    const data=await file.arrayBuffer()
    const wb=XLSX.read(data)
    const ws=wb.Sheets[wb.SheetNames[0]]
    const rows=XLSX.utils.sheet_to_json(ws,{header:1}).filter(r=>r.length>0)
    if(rows.length<2){alert('ไม่พบข้อมูล (ต้องมีแถว header และข้อมูลอย่างน้อย 1 แถว)');return}
    const records=rows.slice(1).filter(r=>r[0]).map(r=>({
      name:String(r[0]||'').trim(),
      village:String(r[1]||'').trim(),
      phone:String(r[2]||'').trim(),
    })).filter(r=>r.name)
    if(!records.length){alert('ไม่พบรายชื่อในไฟล์');return}
    if(!confirm(`นำเข้า ${records.length} รายชื่อ อสม. ใช่หรือไม่?`))return
    const{error}=await sb.from('aosomo_directory').insert(records)
    if(error)throw error
    alert(`✅ นำเข้าสำเร็จ ${records.length} รายชื่อ`)
    loadMembersList()
  }catch(e){alert('❌ เกิดข้อผิดพลาด: '+e.message)}
}

async function deleteAosomoDirectory(id){
  if(!confirm('ลบรายชื่อนี้?'))return
  const{error}=await sb.from('aosomo_directory').delete().eq('id',id)
  if(error){alert('❌ '+error.message);return}
  loadMembersList()
}

async function importStaffDirFile(input){
  const file=input.files[0];if(!file)return;input.value=''
  try{
    const data=await file.arrayBuffer()
    const wb=XLSX.read(data)
    const ws=wb.Sheets[wb.SheetNames[0]]
    const rows=XLSX.utils.sheet_to_json(ws,{header:1}).filter(r=>r.length>0)
    if(rows.length<2){alert('ไม่พบข้อมูล (ต้องมีแถว header และข้อมูลอย่างน้อย 1 แถว)');return}
    const records=rows.slice(1).filter(r=>r[0]).map(r=>({
      name:String(r[0]||'').trim(),
      position:String(r[1]||'').trim(),
      phone:String(r[2]||'').trim(),
    })).filter(r=>r.name)
    if(!records.length){alert('ไม่พบรายชื่อในไฟล์');return}
    if(!confirm(`นำเข้า ${records.length} รายชื่อเจ้าหน้าที่ ใช่หรือไม่?`))return
    const{error}=await sb.from('staff_directory').insert(records)
    if(error)throw error
    alert(`✅ นำเข้าสำเร็จ ${records.length} รายชื่อ`)
    loadMembersList()
  }catch(e){alert('❌ เกิดข้อผิดพลาด: '+e.message)}
}

async function importPatientFile(input){
  const file=input.files[0];if(!file)return;input.value=''
  try{
    const data=await file.arrayBuffer()
    const wb=XLSX.read(data)
    const ws=wb.Sheets[wb.SheetNames[0]]
    const rows=XLSX.utils.sheet_to_json(ws,{header:1}).filter(r=>r.length>0)
    if(rows.length<2){alert('ไม่พบข้อมูล (ต้องมีแถว header และข้อมูลอย่างน้อย 1 แถว)');return}
    const records=rows.slice(1).filter(r=>r[0]).map(r=>({
      name:String(r[0]||'').trim(),
      village:String(r[1]||'').trim(),
      note:String(r[2]||'').trim()||null,
      national_id:String(r[3]||'').replace(/\D/g,'').slice(0,13)||null,
      disease_code:String(r[4]||'').trim()||null,
      disease_name:String(r[5]||'').trim()||null,
      visit_interval:parseInt(r[6])||null,
      inject_interval:parseInt(r[7])||null,
      medication_name:String(r[8]||'').trim()||null,
    })).filter(r=>r.name)
    if(!records.length){alert('ไม่พบรายชื่อในไฟล์');return}
    if(!confirm(`นำเข้า ${records.length} รายชื่อผู้ป่วย ใช่หรือไม่?`))return
    let done=0
    const batchSize=50
    for(let i=0;i<records.length;i+=batchSize){
      const batch=records.slice(i,i+batchSize)
      const{error}=await sb.from('patients').insert(batch)
      if(error)throw error
      done+=batch.length
    }
    alert(`✅ นำเข้าสำเร็จ ${done} รายชื่อ`)
    await loadPatients()
  }catch(e){alert('❌ เกิดข้อผิดพลาด: '+e.message)}
}

async function importHospitalFile(input){
  const file=input.files[0];if(!file)return;input.value=''
  try{
    const data=await file.arrayBuffer()
    const wb=XLSX.read(data)
    const ws=wb.Sheets[wb.SheetNames[0]]
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:''}).filter(r=>r.length>1)
    if(rows.length<2){alert('ไม่พบข้อมูล');return}
    // C=ชื่อ D=สกุล E=เลขบัตร G=เลขที่ H=namemooban I=subdistrict J=district K=province L=รหัสโรค M=ชื่อโรค N=สี
    const colorMap={'เขียว':'green','เหลือง':'yellow','แดง':'red','ส้ม':'yellow'}
    const records=rows.slice(1).filter(r=>String(r[2]||'').trim()).map(r=>{
      const firstName=String(r[2]||'').trim()
      const lastName=String(r[3]||'').trim()
      const name=firstName+(lastName?' '+lastName:'')
      const addrStr=String(r[6]||'')
      const m=addrStr.match(/หมู่(?:ที่)?\s*(\d+)/)
      const village=m?`หมู่ ${m[1]}`:''
      const nid=String(r[4]||'').replace(/\D/g,'').slice(0,13)||null
      const namemooban=String(r[7]||'').trim()
      const subdistrict=String(r[8]||'').trim()
      const district=String(r[9]||'').trim()
      const province=String(r[10]||'').trim()
      const disease_code=String(r[11]||'').trim()
      const disease_name=String(r[12]||'').trim()
      const addressParts=[namemooban,subdistrict&&`ต.${subdistrict}`,district&&`อ.${district}`,province&&`จ.${province}`].filter(Boolean)
      const note=[...new Set(addressParts)].join(' ')
      const colorTh=String(r[13]||'').trim()
      const group_color=colorMap[colorTh]||'yellow'
      const rec={name,village,note,group_color,disease_code,disease_name}
      if(nid)rec.national_id=nid
      return rec
    }).filter(r=>r.name)
    if(!records.length){alert('ไม่พบรายชื่อในไฟล์');return}
    if(!confirm(`นำเข้า ${records.length} รายชื่อผู้ป่วย (รูปแบบ HOSxP/JHCIS) ใช่หรือไม่?`))return
    let done=0
    const batchSize=50
    for(let i=0;i<records.length;i+=batchSize){
      const batch=records.slice(i,i+batchSize)
      const{error}=await sb.from('patients').insert(batch)
      if(error)throw error
      done+=batch.length
    }
    alert(`✅ นำเข้าสำเร็จ ${done} รายชื่อ`)
    await loadPatients()
  }catch(e){alert('❌ เกิดข้อผิดพลาด: '+e.message)}
}

async function deleteStaffDirectory(id){
  if(!confirm('ลบรายชื่อนี้?'))return
  const{error}=await sb.from('staff_directory').delete().eq('id',id)
  if(error){alert('❌ '+error.message);return}
  loadMembersList()
}

async function changeMemberRole(userId,role){
  const{error}=await sb.from('user_profiles').update({role}).eq('id',userId)
  if(error){alert('เกิดข้อผิดพลาด: '+error.message);return}
  await loadMembersList()
}

async function changeMemberVillage(userId,village){
  const{error}=await sb.from('user_profiles').update({village}).eq('id',userId)
  if(error){alert('เกิดข้อผิดพลาด: '+error.message);return}
  await loadMembersList()
}

async function toggleSetting(key,val){
  await sb.from('app_settings').upsert({setting_key:key,setting_value:val?'1':'0'},{onConflict:'setting_key'})
}

const LINE_FUNC_URL = 'https://drwnsumijarzqezljare.supabase.co/functions/v1/smooth-endpoint'

async function saveLineSettings(){
  const token=(document.getElementById('line-token-input')?.value||'').trim()
  const groupId=(document.getElementById('line-groupid-input')?.value||'').trim()
  const btn=document.getElementById('line-save-btn')
  const status=document.getElementById('line-status')
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  const errs=[]
  if(token){const{error}=await sb.from('app_settings').upsert({setting_key:'line_token',setting_value:token},{onConflict:'setting_key'});if(error)errs.push(error.message)}
  if(groupId){const{error}=await sb.from('app_settings').upsert({setting_key:'line_group_id',setting_value:groupId},{onConflict:'setting_key'});if(error)errs.push(error.message)}
  btn.disabled=false;btn.textContent='💾 บันทึก'
  if(errs.length){status.style.color='var(--red)';status.textContent='❌ '+errs.join(', ')}
  else{status.style.color='var(--green)';status.textContent='✅ บันทึกสำเร็จ'}
}

async function testLine(){
  const btn=document.getElementById('line-test-btn')
  const status=document.getElementById('line-status')
  btn.disabled=true;btn.textContent='กำลังส่ง...'
  try{
    const res=await fetch(LINE_FUNC_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},
      body:JSON.stringify({message:`🏥 JitHome ทดสอบแจ้งเตือน LINE\nระบบติดตามผู้ป่วยจิตเวช ${hospitalName}\nเวลา: ${new Date().toLocaleString('th-TH')}`})
    })
    const data=await res.json()
    if(!res.ok||data.error)throw new Error(data.error||'ส่งไม่สำเร็จ')
    status.style.color='var(--green)';status.textContent='✅ ส่งสำเร็จ! ตรวจสอบกลุ่ม LINE ได้เลย'
  }catch(e){status.style.color='var(--red)';status.textContent='❌ '+e.message}
  btn.disabled=false;btn.textContent='📨 ทดสอบส่ง'
}

async function sendLineVisitReport(visitData){
  try{
    const{data}=await sb.from('app_settings').select('setting_value').eq('setting_key','line_enabled').single()
    if(data?.setting_value!=='1')return
    const msg=`🏡 รายงานเยี่ยมบ้าน — ${visitData.visit_type==='staff'?'เจ้าหน้าที่':'อสม.'}\n👤 ${visitData.patient_name} (${visitData.village})\n📅 ${visitData.visit_date}\n👩‍⚕️ ผู้เยี่ยม: ${visitData.visitor||'-'}\n✅ ผ่าน: ${visitData.score} รายการ${visitData.refer?'\n⚠️ ส่งต่อ/รายงานเร่งด่วน':''}`
    await fetch(LINE_FUNC_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`},body:JSON.stringify({message:msg})})
  }catch(e){console.warn('LINE notify error:',e)}
}

async function saveTelegramSettings(){
  const chatid=(document.getElementById('telegram-chatid-input')?.value||'').trim()
  const token=(document.getElementById('telegram-token-input')?.value||'').trim()
  const btn=document.getElementById('tg-save-btn')
  const status=document.getElementById('tg-status')
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  const errs=[]
  if(chatid){const{error}=await sb.from('app_settings').upsert({setting_key:'telegram_chatid',setting_value:chatid},{onConflict:'setting_key'});if(error)errs.push(error.message)}
  if(token){const{error}=await sb.from('app_settings').upsert({setting_key:'telegram_token',setting_value:token},{onConflict:'setting_key'});if(error)errs.push(error.message)}
  if(errs.length){status.style.color='var(--red)';status.textContent='❌ '+errs.join(', ');btn.textContent='💾 บันทึก';btn.disabled=false;return}
  status.style.color='var(--green)';status.textContent='✅ บันทึกสำเร็จ'
  btn.textContent='✅ บันทึกแล้ว'
  setTimeout(()=>{btn.textContent='💾 บันทึก';btn.disabled=false;status.textContent=''},2500)
}

async function testTelegram(){
  const chatid=(document.getElementById('telegram-chatid-input')?.value||'').trim()
  const token=(document.getElementById('telegram-token-input')?.value||'').trim()
  const btn=document.getElementById('tg-test-btn')
  const status=document.getElementById('tg-status')
  if(!chatid||!token){status.style.color='var(--red)';status.textContent='❌ กรุณากรอก Chat ID และ Bot Token ก่อน';return}
  btn.disabled=true;btn.textContent='กำลังส่ง...'
  status.style.color='var(--text3)';status.textContent='กำลังทดสอบ...'
  try{
    const msg=`🏥 *JitHome ทดสอบการแจ้งเตือน*\n\nระบบติดตามผู้ป่วยจิตเวช\nโรงพยาบาล: ${hospitalName}\n\n✅ เชื่อมต่อสำเร็จ!`
    const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({chat_id:chatid,text:msg,parse_mode:'Markdown'})
    })
    const data=await res.json()
    if(data.ok){
      status.style.color='var(--green)';status.textContent='✅ ส่งสำเร็จ! ตรวจสอบกลุ่ม Telegram ได้เลย'
      btn.textContent='✅ สำเร็จ'
    } else {
      status.style.color='var(--red)';status.textContent='❌ '+( data.description||'ส่งไม่สำเร็จ')
      btn.textContent='📨 ทดสอบส่ง'
    }
  }catch(e){
    status.style.color='var(--red)';status.textContent='❌ '+e.message
    btn.textContent='📨 ทดสอบส่ง'
  }
  btn.disabled=false
}

async function saveTokenSetting(key,inputId,btnId){
  const val=(document.getElementById(inputId)?.value||'').trim()
  const btn=document.getElementById(btnId)
  const origText=btn.textContent
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  const{error}=await sb.from('app_settings').upsert({setting_key:key,setting_value:val},{onConflict:'setting_key'})
  if(error){
    console.error('saveTokenSetting error:',error)
    alert('❌ บันทึกไม่สำเร็จ:\n'+error.message)
    btn.textContent=origText;btn.disabled=false;return
  }
  btn.textContent='✅ บันทึกแล้ว'
  setTimeout(()=>{btn.textContent=origText;btn.disabled=false},2000)
}

async function saveSheetURL(){
  const inp=document.getElementById('sheets-url-input')
  const btn=document.getElementById('sheets-save-btn')
  const status=document.getElementById('sheets-status')
  const val=(inp?.value||'').trim()
  if(!val){status.textContent='❌ กรุณากรอก URL';return}
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  try{
    const{error}=await sb.from('app_settings').upsert({setting_key:'sheets_url',setting_value:val},{onConflict:'setting_key'})
    if(error)throw error
    status.style.color='var(--green)';status.textContent='✅ บันทึก URL สำเร็จ'
    btn.textContent='✅ บันทึกแล้ว'
    setTimeout(()=>{btn.textContent='💾 บันทึก URL';btn.disabled=false;status.textContent=''},2500)
  }catch(e){status.style.color='var(--red)';status.textContent='❌ '+e.message;btn.textContent='💾 บันทึก URL';btn.disabled=false}
}

async function importFromSheets(){
  const inp=document.getElementById('sheets-url-input')
  const btn=document.getElementById('sheets-import-btn')
  const status=document.getElementById('sheets-status')
  let url=(inp?.value||'').trim()
  if(!url){status.textContent='❌ กรุณากรอก URL ก่อน';return}
  // Extract sheet ID
  const m=url.match(/\/d\/([a-zA-Z0-9_-]{20,})/)
  if(!m){status.style.color='var(--red)';status.textContent='❌ URL ไม่ถูกต้อง';return}
  const sheetId=m[1]
  btn.disabled=true;btn.textContent='⏳ กำลังโหลด...'
  status.style.color='var(--text3)';status.textContent='กำลังดึงข้อมูลจาก Google Sheets...'
  try{
    const resp=await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`)
    if(!resp.ok)throw new Error('ไม่สามารถเข้าถึง Sheet ได้ (ตรวจสอบว่า Sheet เป็น Public)')
    const text=await resp.text()
    const json=JSON.parse(text.replace(/^[^(]+\(/,'').replace(/\);?\s*$/,''))
    const cols=json.table.cols.map(c=>(c.label||c.id||'').toLowerCase().trim())
    const rows=json.table.rows||[]
    if(!rows.length)throw new Error('ไม่พบข้อมูลใน Sheet')
    // Map columns → find name, village, group, date, interval, note
    const ci={
      name: cols.findIndex(c=>c.includes('ชื่อ')||c.includes('name')),
      village: cols.findIndex(c=>c.includes('หมู่')||c.includes('village')||c.includes('บ้าน')),
      group: cols.findIndex(c=>c.includes('กลุ่ม')||c.includes('group')||c.includes('สี')),
      date: cols.findIndex(c=>c.includes('วัน')||c.includes('date')||c.includes('ฉีด')),
      interval: cols.findIndex(c=>c.includes('รอบ')||c.includes('interval')||c.includes('นัด')),
      note: cols.findIndex(c=>c.includes('หมาย')||c.includes('note')||c.includes('บันทึก')),
    }
    // Fallback by position if no Thai header found
    if(ci.name<0) ci.name=0
    if(ci.village<0) ci.village=1
    if(ci.group<0) ci.group=2
    if(ci.date<0) ci.date=3
    if(ci.interval<0) ci.interval=4
    if(ci.note<0) ci.note=5
    const getVal=(row,i)=>{if(i<0||!row.c||!row.c[i])return '';const v=row.c[i];return v.f||v.v||''}
    let inserted=0,skipped=0,errors=[]
    btn.textContent=`⏳ 0/${rows.length}`
    for(let i=0;i<rows.length;i++){
      const row=rows[i]
      const name=String(getVal(row,ci.name)).trim()
      if(!name||name==='ชื่อ'||name==='name'){skipped++;continue}
      const village=String(getVal(row,ci.village)).trim()||'หมู่ 1'
      const groupStr=String(getVal(row,ci.group)).trim()
      const dateRaw=String(getVal(row,ci.date)).trim()
      const intervalStr=String(getVal(row,ci.interval)).trim()||'1 เดือน'
      const note=String(getVal(row,ci.note)).trim()
      // Parse date — may be Thai BE (พ.ศ.) or ISO
      let dateISO=''
      if(/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)){
        dateISO=dateRaw
      } else if(/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}$/.test(dateRaw)){
        const pts2=dateRaw.split(/[\/\-]/)
        let yr=parseInt(pts2[2])
        if(yr>2400)yr=yr-543
        dateISO=`${yr}-${String(pts2[1]).padStart(2,'0')}-${String(pts2[0]).padStart(2,'0')}`
      } else if(/^\d{1,2}\s+\S+\s+\d{4}$/.test(dateRaw)){
        // Thai format like "15 มิ.ย. 2566"
        const TH_M={'ม.ค.':1,'ก.พ.':2,'มี.ค.':3,'เม.ย.':4,'พ.ค.':5,'มิ.ย.':6,'ก.ค.':7,'ส.ค.':8,'ก.ย.':9,'ต.ค.':10,'พ.ย.':11,'ธ.ค.':12,'มกราคม':1,'กุมภาพันธ์':2,'มีนาคม':3,'เมษายน':4,'พฤษภาคม':5,'มิถุนายน':6,'กรกฎาคม':7,'สิงหาคม':8,'กันยายน':9,'ตุลาคม':10,'พฤศจิกายน':11,'ธันวาคม':12}
        const dp=dateRaw.split(/\s+/)
        const mm=TH_M[dp[1]]||1
        let yr=parseInt(dp[2]);if(yr>2400)yr=yr-543
        dateISO=`${yr}-${String(mm).padStart(2,'0')}-${String(dp[0]).padStart(2,'0')}`
      }
      if(!dateISO){skipped++;continue}
      try{
        const gc=parseGroupColor(groupStr)
        const gl={red:'สุขภาพจิต กลุ่ม สีแดง',yellow:'สุขภาพจิต กลุ่ม สีเหลือง',green:'สุขภาพจิต กลุ่ม สีเขียว'}[gc]
        await sb.from('patients').upsert({name,village},{onConflict:'name'})
        const{data:found}=await sb.from('patients').select('id').eq('name',name).single()
        if(!found)throw new Error('patient not found')
        await sb.from('injection_records').insert({patient_id:found.id,injection_date:dateISO,group_color:gc,group_label:gl,interval_str:intervalStr,interval_days:parseInterval(intervalStr),note})
        inserted++
      }catch(e){errors.push(name+': '+e.message)}
      if((i+1)%5===0)btn.textContent=`⏳ ${i+1}/${rows.length}`
    }
    allPatients=await getPatients()
    status.style.color='var(--green)'
    status.textContent=`✅ นำเข้าสำเร็จ ${inserted} รายการ${skipped?` · ข้ามไป ${skipped}`:''}`
    if(errors.length)status.textContent+=` · ผิดพลาด ${errors.length} รายการ`
    btn.textContent='📥 นำเข้าข้อมูล';btn.disabled=false
  }catch(e){
    status.style.color='var(--red)';status.textContent='❌ '+e.message
    btn.textContent='📥 นำเข้าข้อมูล';btn.disabled=false
  }
}

function appendNote(text){const ta=document.getElementById('adm-note');if(ta)ta.value=ta.value?ta.value+' · '+text:text}

async function saveAdminRecord(){
  const name=document.getElementById('adm-name')?.value?.trim()
  const village=document.getElementById('adm-village')?.value
  const groupStr=document.getElementById('adm-group')?.value
  const date=document.getElementById('adm-date')?.value
  const interval=document.getElementById('adm-interval')?.value
  const note=document.getElementById('adm-note')?.value?.trim()||''
  const btn=document.getElementById('adm-btn')
  if(!name||!date){alert('กรุณากรอกชื่อและวันที่');return}
  const gc2=parseGroupColor(groupStr)
  const gl2={red:'สุขภาพจิต กลุ่ม สีแดง',yellow:'สุขภาพจิต กลุ่ม สีเหลือง',green:'สุขภาพจิต กลุ่ม สีเขียว'}[gc2]
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  try{
    await sb.from('patients').upsert({name,village},{onConflict:'name'})
    const{data:found}=await sb.from('patients').select('id').eq('name',name).single()
    if(!found)throw new Error('ไม่พบผู้ป่วย')
    await sb.from('patients').update({village}).eq('id',found.id)
    const{error}=await sb.from('injection_records').insert({patient_id:found.id,injection_date:date,group_color:gc2,group_label:gl2,interval_str:interval,interval_days:parseInterval(interval),note})
    if(error)throw error
    btn.textContent='✅ บันทึกสำเร็จ'
    document.getElementById('adm-name').value=''
    document.getElementById('adm-note').value=''
    allPatients=await getPatients()
    setTimeout(()=>{btn.textContent='บันทึกนัดหมาย';btn.disabled=false},2500)
  }catch(e){btn.textContent='❌ '+(e.message||'ผิดพลาด');btn.disabled=false}
}

async function saveSettings(){
  const val=document.getElementById('s-hospital')?.value?.trim()
  const btn=document.getElementById('settings-btn')
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  try{
    const{error}=await sb.from('app_settings').upsert({setting_key:'hospital_name',setting_value:val},{onConflict:'setting_key'})
    if(error)throw error
    hospitalName=val
    document.getElementById('header-sub').textContent=val
    btn.textContent='✅ บันทึกแล้ว'
    setTimeout(()=>{btn.textContent='บันทึกการตั้งค่า';btn.disabled=false},2000)
  }catch(e){btn.textContent='❌ ผิดพลาด';btn.disabled=false}
}

function exportCSV(){
  const rows=allPatients.map(p=>[p.name,p.village,p.group_label,p.interval_str,thDate(p.last_date),thDate(p.next_date),p.days_until,p.note||''])
  const hdr=['ชื่อ','หมู่บ้าน','กลุ่มสี','รอบนัด','วันฉีดล่าสุด','วันนัดต่อไป','วันคงเหลือ','หมายเหตุ']
  const csv=[hdr,...rows].map(r=>r.map(c=>`"${String(c||'').replace(/"/g,'""')}"`).join(',')).join('\n')
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}));a.download='jithome.csv';a.click()
}
function exportJSON(){
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(allPatients,null,2)],{type:'application/json'}));a.download='jithome.json';a.click()
}

function downloadTemplate(type){
  let csv,filename
  if(type==='staff_dir'){
    csv='ชื่อ-นามสกุล,ตำแหน่ง,เบอร์โทร\n'+
      'นายสมชาย ใจดี,พยาบาลวิชาชีพ,0812345678\n'+
      'นางสาวอรุณี สว่างจิต,เจ้าพนักงานสาธารณสุข,0823456789\n'+
      'นายวิชัย มั่นคง,นักวิชาการสาธารณสุข,0834567890'
    filename='ตัวอย่าง_รายชื่อเจ้าหน้าที่.csv'
  } else if(type==='aosomo'){
    csv='ชื่อ-นามสกุล,หมู่บ้าน,เบอร์โทร\n'+
      'นางสาวมาลี ใจดี,หมู่ 1,0812345678\n'+
      'นายสมชาย รักษ์ดี,หมู่ 1,0823456789\n'+
      'นางวิไล สุขสันต์,หมู่ 2,0834567890\n'+
      'นางสาวอารีย์ แก้วใส,หมู่ 2,0845678901\n'+
      'นายประสิทธิ์ ทองดี,หมู่ 3,0856789012'
    filename='ตัวอย่าง_รายชื่ออสม.csv'
  } else {
    csv='ชื่อ-นามสกุล,หมู่บ้าน,หมายเหตุ,เลขบัตรประชาชน,รหัสโรค,ชื่อโรค,เยี่ยมบ้านทุก(เดือน),ฉีดยาทุก(เดือน),รายการยาที่ฉีด\n'+
      'นายสมศักดิ์ ใจเย็น,หมู่ 1,โรคจิตเภท ติดตามทุกเดือน,1100100123456,F20,Schizophrenia,1,1,Invega 100mg\n'+
      'นางสาวอรุณี สว่างจิต,หมู่ 2,,1100200234567,F102,Alcohol Dependence,1,3,DEPO-A\n'+
      'นายวิชัย มั่นคง,หมู่ 3,ผู้ดูแลคือนางสมศรี โทร 089-xxx,,F150,,1,,\n'+
      'นางประภา รุ่งเรือง,หมู่ 1,,,,,,,\n'+
      'นายธนพล ใจกว้าง,หมู่ 4,แพ้ยา Haloperidol,,F152,,1,1,Flupentixol 40mg'
    filename='ตัวอย่าง_รายชื่อผู้ป่วย.csv'
  }
  const a=document.createElement('a')
  a.href=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}))
  a.download=filename
  a.click()
}

// ─── Patient Modal ───────────────────────────────────────────────
async function openModal(id){
  const ov=document.getElementById('modal-overlay'),ct=document.getElementById('modal-content')
  ov.style.display='flex'
  ct.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)">⏳ กำลังโหลด...</div>'
  try{
    const{data:p}=await sb.from('patient_status').select('*').eq('id',id).single()
    if(!p)throw new Error('ไม่พบผู้ป่วย')
    p.group_label=groupLabel(p.group_color)
    const hist=await getHistory(id)
    const todayStr=todayISO()
    const futureRecs=hist.filter(h=>h.injection_date>todayStr)
    const pastRecs=hist.filter(h=>h.injection_date<=todayStr)
    // วันนัดครั้งต่อไป: ถ้ามี record อนาคต ใช้วันที่เร็วที่สุดของ record นั้นโดยตรง
    const correctedNextDate=futureRecs.length>0
      ?[...futureRecs].sort((a,b)=>a.injection_date.localeCompare(b.injection_date))[0].injection_date
      :p.next_date
    const correctedDays=Math.round((new Date(correctedNextDate+'T00:00:00')-new Date(todayStr+'T00:00:00'))/86400000)
    const chip=daysChip(correctedDays)
    const histHtml=hist.slice(0,8).map((h)=>{
      const isFuture=h.injection_date>todayStr
      const isFirstPast=!isFuture&&pastRecs[0]?.id===h.id
      const dotColor=isFuture?'#f59e0b':isFirstPast?'var(--primary)':'var(--border)'
      const badge=isFuture
        ?`<span style="font-size:10px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-weight:700">📅 นัดหมาย</span>`
        :isFirstPast?`<span style="font-size:10px;background:var(--primary-lt);color:var(--primary);padding:1px 6px;border-radius:4px;font-weight:700">ล่าสุด</span>`:''
      const rowBg=isFuture?'background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:8px;margin-bottom:4px':''
      return`
    <div class="history-item" id="hist-${h.id}" style="${rowBg}">
      <div class="history-dot" style="background:${dotColor};margin-top:5px"></div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:6px">
          <div class="history-date">${esc(h.date_th)} ${badge}</div>
          ${canDo('record')?`<div style="display:flex;gap:2px">
            <button onclick="toggleEditRecord(${h.id},'${h.injection_date}','${esc(h.interval_str||'')}','${esc(h.note||'')}')" style="background:none;border:none;cursor:pointer;color:var(--text3);font-size:11px;padding:2px 4px;font-family:'Sarabun',sans-serif" title="แก้ไข">✏️</button>
            <button onclick="deleteRecord(${h.id},${p.id})" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:11px;padding:2px 4px;font-family:'Sarabun',sans-serif" title="ลบรายการนี้">🗑️</button>
          </div>`:''}
        </div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">${esc(h.group_label||'')} · ${esc(h.interval_str||'')}</div>
        ${h.note?`<div class="history-note">${esc(h.note)}</div>`:''}
        <div id="edit-rec-${h.id}" style="display:none;background:#f0f9ff;border:1px solid rgba(10,126,164,.2);border-radius:8px;padding:10px;margin-top:8px">
          <div style="font-size:12px;font-weight:700;color:var(--primary);margin-bottom:8px">แก้ไขรายการ</div>
          <div class="form-group" style="margin-bottom:8px"><label style="font-size:11px">${isFuture?'วันนัดหมาย':'วันที่ฉีดยา'}</label><input type="date" id="er-date-${h.id}" value="${h.injection_date}"></div>
          <div class="form-group" style="margin-bottom:8px"><label style="font-size:11px">รอบนัดต่อไป</label>
            <select id="er-interval-${h.id}" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-family:'Sarabun',sans-serif;font-size:13px">
              ${['2 สัปดาห์','3 สัปดาห์','4 สัปดาห์','1 เดือน','3 เดือน'].map(v=>`<option${v===h.interval_str?' selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="margin-bottom:8px"><label style="font-size:11px">หมายเหตุ</label><input type="text" id="er-note-${h.id}" value="${esc(h.note||'')}"></div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-primary" style="flex:1;font-size:12px;padding:6px" id="er-save-${h.id}" onclick="saveEditRecord(${h.id},${p.id})">บันทึก</button>
            <button class="btn btn-outline" style="font-size:12px;padding:6px" onclick="toggleEditRecord(${h.id})">ยกเลิก</button>
          </div>
        </div>
      </div>
    </div>`}).join('')
    ct.innerHTML=`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
      <div><div style="font-size:20px;font-weight:700;margin-bottom:4px">${esc(p.name)}</div><div style="font-size:14px;color:var(--text3)">${esc(p.village||'')} · ${esc(hospitalName)}</div></div>
      <div style="display:flex;gap:6px;align-items:center">
        ${canDo('record')?`<button onclick="openEditPatient(${p.id},'${esc(p.name)}','${esc(p.village||'')}','${esc(p.note||'')}','${esc(p.staff_responsible||'')}','${esc(p.aosomo_responsible||'')}','${esc(p.national_id||'')}')" style="background:none;border:1px solid var(--border);border-radius:6px;cursor:pointer;color:var(--text2);padding:4px 8px;font-size:11px;font-family:'Sarabun',sans-serif">✏️ แก้ไข</button>`:''}
        <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
      </div>
    </div>
    <div id="edit-patient-wrap" style="display:none;background:#f0fdf4;border:1px solid #86efac;border-radius:10px;padding:14px;margin-bottom:14px">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:#166534">✏️ แก้ไขข้อมูลผู้ป่วย</div>
      <div class="form-group"><label>ชื่อ-นามสกุล</label><input type="text" id="edit-pt-name" style="width:100%;box-sizing:border-box"></div>
      <div class="form-group"><label>หมู่บ้าน</label><select id="edit-pt-village" onchange="refreshAosomoByVillage(this.value)">${['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต'].map(v=>`<option>${v}</option>`).join('')}</select></div>
      <div class="form-group"><label>👨‍⚕️ เจ้าหน้าที่รับผิดชอบ</label><select id="edit-pt-staff" style="width:100%"><option value="">— ไม่ระบุ —</option></select></div>
      <div class="form-group"><label>🏡 อสม. รับผิดชอบ <span id="edit-pt-aosomo-village" style="font-size:11px;color:#7c3aed;font-weight:400"></span></label><select id="edit-pt-aosomo" style="width:100%"><option value="">— ไม่ระบุ —</option></select></div>
      <div class="form-group"><label>หมายเหตุ</label><input type="text" id="edit-pt-note"></div>
      ${canDo('admin')?`<div class="form-group">
        <label>🪪 เลขบัตรประชาชน <span style="font-size:11px;background:#fef3c7;color:#92400e;padding:1px 6px;border-radius:4px;font-weight:700">admin เท่านั้น</span></label>
        <input type="text" id="edit-pt-nid" placeholder="X-XXXX-XXXXX-XX-X" maxlength="17" inputmode="numeric"
          oninput="this.value=formatNationalIdInput(this.value)" style="letter-spacing:1px">
      </div>`:''}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group"><label>🏡 เยี่ยมบ้านทุก (เดือน)</label><select id="edit-pt-visit-interval">
          <option value="">— ไม่ระบุ —</option>
          ${[1,2,3,6].map(n=>`<option value="${n}">${n} เดือน</option>`).join('')}
        </select></div>
        <div class="form-group"><label>💉 ฉีดยาทุก (เดือน)</label><select id="edit-pt-inject-interval">
          <option value="">— ไม่ระบุ —</option>
          ${[1,2,3,6].map(n=>`<option value="${n}">${n} เดือน</option>`).join('')}
        </select></div>
      </div>
      <div class="form-group"><label>💊 รายการยาที่ฉีด</label><input type="text" id="edit-pt-medication" placeholder="เช่น Invega 100mg, DEPO-A, Flupentixol 40mg"></div>
      <div class="form-group">
        <label>📎 แนบไฟล์ใหม่ (ภาพ / PDF / Excel ไม่เกิน 10 MB)</label>
        ${p.file_url?`<a href="${esc(p.file_url)}" target="_blank" style="display:flex;align-items:center;gap:6px;font-size:11px;color:var(--primary);margin-bottom:6px;text-decoration:none">📄 ไฟล์ปัจจุบัน (คลิกดู) — อัปโหลดใหม่เพื่อแทนที่</a>`:''}
        <div id="edit-pt-file-wrap" onclick="document.getElementById('edit-pt-file').click()"
          style="border:2px dashed var(--border);border-radius:8px;padding:10px;text-align:center;cursor:pointer;background:#fff">
          <div id="edit-pt-file-label" style="font-size:12px;color:var(--text3)">📁 กดเพื่อเลือกไฟล์</div>
          <input type="file" id="edit-pt-file" accept="image/*,.pdf,.xls,.xlsx,.csv" style="display:none"
            onchange="const f=this.files[0];if(f){if(f.size>10*1024*1024){alert('ไฟล์ใหญ่เกิน 10 MB');this.value='';return}document.getElementById('edit-pt-file-label').textContent='✅ '+f.name+' ('+(f.size/1024).toFixed(0)+' KB)';document.getElementById('edit-pt-file-wrap').style.borderColor='var(--primary)'}">
        </div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" id="edit-pt-save-btn" onclick="saveEditPatient(${p.id})">บันทึกการแก้ไข</button>
        <button class="btn btn-outline" onclick="closeEditPatient()">ยกเลิก</button>
      </div>
      ${canDo('admin')?`<button onclick="deletePatient(${p.id},'${esc(p.name)}')" style="width:100%;margin-top:8px;padding:8px;border-radius:8px;border:1px solid #fca5a5;background:#fef2f2;color:#b91c1c;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">🗑️ ลบผู้ป่วยรายนี้ออกจากระบบ</button>`:''}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <span class="badge ${p.group_color}"><span class="badge-dot"></span>${esc(p.group_label)}</span>
      <span class="days-chip ${chip.cls}">${chip.label}</span>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:16px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:2px">วันนัดครั้งต่อไป</div>
      <div style="font-size:16px;font-weight:700;color:var(--primary)">${thDateFull(correctedNextDate)}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">รอบการฉีดยา: ${esc(futureRecs.length>0?futureRecs[0].interval_str:p.interval_str||'')}</div>
    </div>
    ${(p.staff_responsible||p.aosomo_responsible)?`
    <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:12px;display:flex;gap:16px;flex-wrap:wrap">
      ${p.staff_responsible?`<div style="font-size:12px"><span style="color:var(--text3)">👨‍⚕️ เจ้าหน้าที่:</span> <strong>${esc(p.staff_responsible)}</strong></div>`:''}
      ${p.aosomo_responsible?`<div style="font-size:12px"><span style="color:var(--text3)">🏡 อสม.:</span> <strong>${esc(p.aosomo_responsible)}</strong></div>`:''}
    </div>`:''}
    ${p.national_id?`<div style="background:${canDo('admin')?'#fefce8':'#f9fafb'};border:1px solid ${canDo('admin')?'#fde68a':'var(--border)'};border-radius:8px;padding:8px 12px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
      <span style="font-size:14px">🪪</span>
      <div>
        <div style="font-size:10px;color:var(--text3);font-weight:600">เลขบัตรประชาชน ${canDo('admin')?'':' <span style="background:#e5e7eb;color:#6b7280;padding:0 5px;border-radius:4px;font-size:10px">PDPA</span>'}</div>
        <div style="font-size:13px;font-weight:700;letter-spacing:1px;color:${canDo('admin')?'#92400e':'var(--text3)'}">${maskNationalId(p.national_id)}</div>
      </div>
    </div>`:''}
    ${(p.visit_interval||p.inject_interval||p.medication_name)?`<div style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:8px 12px;margin-bottom:10px;display:flex;flex-wrap:wrap;gap:10px">
      ${p.visit_interval?`<div style="font-size:12px"><span style="color:var(--text3)">🏡 เยี่ยมบ้าน</span> <strong style="color:#15803d">ทุก ${p.visit_interval} เดือน</strong></div>`:''}
      ${p.inject_interval?`<div style="font-size:12px"><span style="color:var(--text3)">💉 ฉีดยา</span> <strong style="color:#15803d">ทุก ${p.inject_interval} เดือน</strong></div>`:''}
      ${p.medication_name?`<div style="font-size:12px;width:100%"><span style="color:var(--text3)">💊 ยา:</span> <strong>${esc(p.medication_name)}</strong></div>`:''}
    </div>`:''}
    ${p.disease_code||p.disease_name?`<div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:8px 12px;margin-bottom:10px;display:flex;align-items:center;gap:10px">
      <div style="font-size:20px">🏥</div>
      <div>
        ${p.disease_code?`<div style="font-size:12px;font-weight:700;color:#0369a1;letter-spacing:.5px">${esc(p.disease_code)}</div>`:''}
        ${p.disease_name?`<div style="font-size:12px;color:#0c4a6e">${esc(p.disease_name)}</div>`:''}
      </div>
    </div>`:''}
    ${p.note?`<div style="background:var(--yellow-lt);border:1px solid var(--yellow-bd);border-radius:8px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:#92400e">📋 ${esc(p.note)}</div>`:''}
    ${p.file_url?`<a href="${esc(p.file_url)}" target="_blank" style="display:flex;align-items:center;gap:8px;background:var(--primary-lt);border:1px solid rgba(10,126,164,.2);border-radius:8px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:var(--primary);text-decoration:none;font-weight:600">📎 ดูไฟล์แนบ</a>`:''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700">ประวัติการฉีดยา (${pastRecs.length} ครั้ง)${futureRecs.length>0?`<span style="font-size:11px;font-weight:400;color:#92400e;margin-left:6px">📅 นัดหมาย ${futureRecs.length} รายการ</span>`:''}</div>
      <button onclick="toggleRecordForm()" style="background:var(--primary);color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">+ บันทึก</button>
    </div>
    <div id="record-form-wrap" style="display:none;background:var(--primary-lt);border-radius:10px;padding:14px;margin-bottom:12px;border:1px solid rgba(10,126,164,.2)">
      <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--primary)">บันทึกการฉีดยา</div>
      <div class="form-group"><label>วันที่ฉีดยา</label><input type="date" id="rec-date" value="${todayISO()}"></div>
      <div class="form-group"><label>รอบนัดต่อไป</label><select id="rec-interval"><option>2 สัปดาห์</option><option>3 สัปดาห์</option><option>4 สัปดาห์</option><option selected>1 เดือน</option><option>3 เดือน</option></select></div>
      <div class="form-group"><label>หมายเหตุ</label><input type="text" id="rec-note" placeholder="ผลการฉีดยา, อาการ..."></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1" id="rec-save-btn" onclick="saveModalRecord(${p.id},'${p.group_color}')">บันทึก</button>
        <button class="btn btn-outline" onclick="toggleRecordForm()">ยกเลิก</button>
      </div>
    </div>
    <div>${histHtml}</div>
    ${hist.length>8?`<div style="font-size:12px;color:var(--text3);text-align:center;padding-top:8px">+ ${hist.length-8} รายการก่อนหน้า</div>`:''}`
  }catch(e){ct.innerHTML=`<div style="padding:20px;color:var(--red)">เกิดข้อผิดพลาด: ${esc(e.message)}</div>`}
}
function closeModal(){document.getElementById('modal-overlay').style.display='none'}

function toggleEditRecord(id,date,interval,note){
  const wrap=document.getElementById('edit-rec-'+id)
  if(!wrap)return
  if(date===undefined){wrap.style.display='none';return}
  wrap.style.display=wrap.style.display==='none'?'block':'none'
}

async function saveEditRecord(id,patientId){
  const dateEl=document.getElementById('er-date-'+id)
  const intervalEl=document.getElementById('er-interval-'+id)
  const noteEl=document.getElementById('er-note-'+id)
  const btn=document.getElementById('er-save-'+id)
  const date=dateEl?.value
  const interval=intervalEl?.value
  const note=noteEl?.value||''
  if(!date){alert('กรุณาเลือกวันที่');return}
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  try{
    const{error}=await sb.from('injection_records').update({
      injection_date:date,
      interval_str:interval,
      interval_days:parseInterval(interval),
      note
    }).eq('id',id)
    if(error)throw error
    await openModal(patientId)
  }catch(e){btn.textContent='❌ '+e.message;btn.disabled=false}
}

async function deleteRecord(id,patientId){
  if(!confirm('ลบรายการฉีดยานี้ออกจากประวัติ?\nการดำเนินการนี้ไม่สามารถย้อนกลับได้'))return
  const{error}=await sb.from('injection_records').delete().eq('id',id)
  if(error){alert('เกิดข้อผิดพลาด: '+error.message);return}
  await openModal(patientId)
}

function toggleEditPatient(){}
function closeEditPatient(){
  const w=document.getElementById('edit-patient-wrap')
  if(w)w.style.display='none'
}
async function openEditPatient(id,name,village,note,staffResp,aosomoResp,nationalId){
  const w=document.getElementById('edit-patient-wrap')
  if(!w)return
  if(w.style.display!=='none'){w.style.display='none';return}
  w.style.display='block'
  const nEl=document.getElementById('edit-pt-name')
  const vEl=document.getElementById('edit-pt-village')
  const ntEl=document.getElementById('edit-pt-note')
  const nidEl=document.getElementById('edit-pt-nid')
  if(nEl)nEl.value=name||''
  if(ntEl)ntEl.value=note||''
  if(nidEl)nidEl.value=formatNationalIdInput(nationalId||'')
  // ตั้งค่า dropdown หมู่บ้าน
  if(vEl){
    let matched=false
    for(const o of vEl.options)if(o.value===village||o.text===village){o.selected=true;matched=true;break}
    if(!matched) vEl.selectedIndex=0
  }
  // โหลด dropdown เจ้าหน้าที่ (user_profiles + staff_directory)
  const staffSel=document.getElementById('edit-pt-staff')
  if(staffSel){
    const[{data:staffList},{data:staffDir}]=await Promise.all([
      sb.from('user_profiles').select('display_name').in('role',['admin','staff']).order('display_name'),
      sb.from('staff_directory').select('name,position').order('name')
    ])
    const userNames=(staffList||[]).map(s=>s.display_name||'').filter(Boolean)
    const dirNames=(staffDir||[]).map(s=>s.name).filter(n=>!userNames.includes(n))
    staffSel.innerHTML='<option value="">— ไม่ระบุ —</option>'+
      userNames.map(n=>`<option value="${esc(n)}"${n===staffResp?' selected':''}>${esc(n)}</option>`).join('')
    if(dirNames.length)
      staffSel.innerHTML+=`<optgroup label="📋 รายชื่อที่นำเข้า">` +
        dirNames.map(n=>`<option value="${esc(n)}"${n===staffResp?' selected':''}>${esc(n)}</option>`).join('') +
        `</optgroup>`
    if(staffResp&&!userNames.includes(staffResp)&&!dirNames.includes(staffResp))
      staffSel.innerHTML+=`<option value="${esc(staffResp)}" selected>${esc(staffResp)}</option>`
  }
  // โหลดข้อมูลเพิ่มเติม (visit_interval, inject_interval, medication_name)
  const {data:extra}=await sb.from('patients').select('visit_interval,inject_interval,medication_name').eq('id',id).single()
  if(extra){
    const vi=document.getElementById('edit-pt-visit-interval')
    const ii=document.getElementById('edit-pt-inject-interval')
    const med=document.getElementById('edit-pt-medication')
    if(vi)vi.value=extra.visit_interval||''
    if(ii)ii.value=extra.inject_interval||''
    if(med)med.value=extra.medication_name||''
  }
  // โหลด dropdown อสม. — ส่ง village ตรงจากข้อมูลผู้ป่วย (ไม่ผ่าน select element)
  await refreshAosomoByVillage(village, aosomoResp)
}

async function refreshAosomoByVillage(village, currentVal){
  const aosomoSel=document.getElementById('edit-pt-aosomo')
  if(!aosomoSel)return
  if(currentVal===undefined) currentVal=aosomoSel.value
  // ถ้าไม่มี village ให้อ่านจาก dropdown หมู่บ้านโดยตรง
  if(!village){
    const vEl=document.getElementById('edit-pt-village')
    if(vEl) village=vEl.options[vEl.selectedIndex]?.value||''
  }
  // แสดง village ที่กำลังกรองใน label
  const lbl=document.getElementById('edit-pt-aosomo-village')
  if(lbl) lbl.textContent=village?`(กรอง: ${village})`:'(เลือกหมู่บ้านก่อน)'
  aosomoSel.innerHTML='<option value="">⏳ กำลังโหลด...</option>'
  // ดึงข้อมูลโดยกรอง village จาก Supabase โดยตรง
  let q=sb.from('aosomo_directory').select('name,village').order('name')
  if(village) q=q.eq('village',village)
  else{ aosomoSel.innerHTML='<option value="">— ไม่ระบุ —</option>'; return }
  const{data:list,error}=await q
  if(error){ aosomoSel.innerHTML='<option value="">❌ โหลดไม่สำเร็จ</option>'; return }
  if(!list||list.length===0){
    aosomoSel.innerHTML='<option value="">— ไม่พบ อสม. ใน'+village+' —</option>'
    // เพิ่มตัวเลือกปัจจุบันไว้ถ้ามี
    if(currentVal) aosomoSel.innerHTML+=`<option value="${esc(currentVal)}" selected>${esc(currentVal)}</option>`
    return
  }
  aosomoSel.innerHTML='<option value="">— ไม่ระบุ —</option>'+
    list.map(a=>`<option value="${esc(a.name)}"${a.name===currentVal?' selected':''}>${esc(a.name)}</option>`).join('')
  // ถ้าค่าปัจจุบันไม่อยู่ในรายชื่อ ให้แสดงไว้พร้อมเตือน
  if(currentVal&&!list.find(a=>a.name===currentVal)){
    const{data:found}=await sb.from('aosomo_directory').select('name,village').eq('name',currentVal).maybeSingle()
    if(found)
      aosomoSel.innerHTML+=`<option value="${esc(found.name)}" selected>${esc(found.name)} ⚠️ (${esc(found.village||'ต่างหมู่')})</option>`
    else if(currentVal)
      aosomoSel.innerHTML+=`<option value="${esc(currentVal)}" selected>${esc(currentVal)}</option>`
  }
}
async function deletePatient(id,name){
  if(!confirm(`ลบผู้ป่วย "${name}" ออกจากระบบ?\n\nประวัติการฉีดยาทั้งหมดจะถูกลบด้วย\nไม่สามารถกู้คืนได้!`))return
  try{
    const{error}=await sb.from('patients').delete().eq('id',id)
    if(error)throw error
    closeModal()
    allPatients=await getPatients()
    if(location.hash==='#patients')navigate('patients')
  }catch(e){alert('❌ ลบไม่สำเร็จ: '+e.message)}
}
async function saveEditPatient(id){
  const name=(document.getElementById('edit-pt-name')?.value||'').trim()
  const village=document.getElementById('edit-pt-village')?.value||''
  const note=(document.getElementById('edit-pt-note')?.value||'').trim()
  const staff_responsible=document.getElementById('edit-pt-staff')?.value||''
  const aosomo_responsible=document.getElementById('edit-pt-aosomo')?.value||''
  const nidRaw=(document.getElementById('edit-pt-nid')?.value||'').replace(/\D/g,'')
  const btn=document.getElementById('edit-pt-save-btn')
  if(!name){alert('กรุณากรอกชื่อผู้ป่วย');return}
  const fileInput=document.getElementById('edit-pt-file')
  const file=fileInput?.files?.[0]||null
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  try{
    const visit_interval=parseInt(document.getElementById('edit-pt-visit-interval')?.value)||null
    const inject_interval=parseInt(document.getElementById('edit-pt-inject-interval')?.value)||null
    const medication_name=(document.getElementById('edit-pt-medication')?.value||'').trim()||null
    const updates={name,village,note,staff_responsible,aosomo_responsible,visit_interval,inject_interval,medication_name}
    if(canDo('admin'))updates.national_id=nidRaw
    if(file){
      btn.textContent='กำลังอัพโหลดไฟล์...'
      const ext=file.name.split('.').pop()
      const filename=`${Date.now()}_${name.replace(/\s+/g,'_')}.${ext}`
      const{error:ue}=await sb.storage.from('patient-files').upload(filename,file)
      if(ue)throw ue
      const{data:{publicUrl}}=sb.storage.from('patient-files').getPublicUrl(filename)
      updates.file_url=publicUrl
      btn.textContent='กำลังบันทึก...'
    }
    const{error}=await sb.from('patients').update(updates).eq('id',id)
    if(error)throw error
    allPatients=await getPatients()
    await openModal(id)
  }catch(e){btn.textContent='❌ '+e.message;btn.disabled=false}
}
function toggleRecordForm(){const w=document.getElementById('record-form-wrap');if(w)w.style.display=w.style.display==='none'?'':'none'}

async function saveModalRecord(pid,gc){
  const date=document.getElementById('rec-date')?.value
  const interval=document.getElementById('rec-interval')?.value
  const note=document.getElementById('rec-note')?.value||''
  const btn=document.getElementById('rec-save-btn')
  if(!date){alert('กรุณาเลือกวันที่');return}
  const gl={red:'สุขภาพจิต กลุ่ม สีแดง',yellow:'สุขภาพจิต กลุ่ม สีเหลือง',green:'สุขภาพจิต กลุ่ม สีเขียว'}[gc]
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  try{
    const{error}=await sb.from('injection_records').insert({patient_id:pid,injection_date:date,group_color:gc,group_label:gl,interval_str:interval,interval_days:parseInterval(interval),note})
    if(error)throw error
    closeModal();allPatients=await getPatients()
  }catch(e){btn.textContent='❌ '+e.message;btn.disabled=false}
}

// ─── Visit Modal ─────────────────────────────────────────────────
function openVisitForm(type){
  const ov=document.getElementById('visit-overlay'),ct=document.getElementById('visit-content')
  if(!ov||!ct)return
  _visitType=type;_visitChecks=[];_oasScores={s1:0,s2:0,s3:0};_redFlags=[];_ytAssess={ya:null,yati:null,sara:null};_assess10={}
  const cl=type==='staff'?STAFF_CHECKLIST:AOSOMO_CHECKLIST
  const nameOpts=allPatients.map(p=>`<option value="${esc(p.name)}" data-village="${esc(p.village||'')}">`).join('')
  ct.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div><div style="font-size:17px;font-weight:700">${type==='staff'?'🏥 บันทึกเยี่ยมบ้าน (เจ้าหน้าที่)':'🏡 บันทึกเยี่ยมบ้าน (อสม.)'}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:2px">${type==='staff'?'แบบประเมินสำหรับเจ้าหน้าที่':'แบบประเมินสำหรับ อสม.'}</div></div>
    <button onclick="closeVisitModal()" style="background:none;border:none;cursor:pointer;color:var(--text3)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>
  <div class="form-group"><label>ชื่อผู้ป่วย</label><input list="vn-list" id="v-name" placeholder="เลือกหรือพิมพ์ชื่อ" oninput="autoFillVillage(this.value)"><datalist id="vn-list">${nameOpts}</datalist></div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
    <div class="form-group" style="margin-bottom:0"><label>หมู่บ้าน</label><select id="v-village">${['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต'].map(v=>`<option>${v}</option>`).join('')}</select></div>
    <div class="form-group" style="margin-bottom:0"><label>วันที่เยี่ยม</label><input type="date" id="v-date" value="${todayISO()}"></div>
  </div>
  <div class="form-group"><label>${type==='staff'?'ผู้ออกเยี่ยม (เจ้าหน้าที่)':'อสม. ผู้ออกเยี่ยม'}</label><input type="text" id="v-visitor" value="${esc(currentDisplayName)}" placeholder="${type==='staff'?'ชื่อเจ้าหน้าที่...':'ชื่อ อสม....'}"></div>
  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700">รายการตรวจสอบ</div>
      <span id="score-badge" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:var(--red-lt);color:var(--red)">0/${cl.length} · ต้องติดตาม</span>
    </div>
    ${cl.map(([id,lbl])=>`<div class="check-item" onclick="toggleCheck('${id}')"><div class="check-box" id="cb-${id}"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><span class="check-label">${esc(lbl)}</span></div>`).join('')}
  </div>
  ${type==='staff'?`
  <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:14px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700">📊 แบบประเมิน OAS</div>
      <span id="oas-badge" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#f3f4f6;color:var(--text3)">ไม่พบพฤติกรรม</span>
    </div>
    ${[
      ['s1','พฤติกรรมก้าวร้าวต่อตนเอง',
        'ไม่พบ',
        'ขีดข่วน ตีตนเอง ดึงผม รอยขนาดเล็ก',
        'ทำร้ายตนเองรุนแรง มีรอยซ้ำ เลือดออก หมดสติ',
        'ทำร้ายตนเองรุนแรงมาก อวัยวะภายในได้รับอันตราย'],
      ['s2','พฤติกรรมก้าวร้าวต่อผู้อื่น (คำพูด/การกระทำ)',
        'ไม่พบ',
        'ตะโกน ด่าด้วยถ้อยคำไม่รุนแรง',
        'ด่าหยาบ คุกคาม ผลัก ตี แต่ไม่บาดเจ็บ',
        'ทำร้ายผู้อื่นจนบาดเจ็บ กระดูกหัก หมดสติ'],
      ['s3','พฤติกรรมก้าวร้าวต่อทรัพย์สิน',
        'ไม่พบ',
        'ปิดประตูเสียงดัง รื้อข้าวของกระจัดกระจาย',
        'ขว้าง เตะ ทุบวัตถุหรือสิ่งของ',
        'ทุบกระจก ขว้างมีด จุดไฟเผา สิ่งของแตกหัก'],
    ].map(([sid,label,l0,l1,l2,l3])=>`
    <div style="margin-bottom:12px">
      <div style="font-size:12px;font-weight:700;color:var(--text1);margin-bottom:6px">${label}</div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:4px">
        ${[[0,l0,'#f3f4f6','var(--text3)'],[1,l1,'#fef3c7','#92400e'],[2,l2,'#fee2e2','var(--red)'],[3,l3,'#fecaca','#991b1b']].map(([score,desc,bg,clr])=>`
        <button type="button" id="oas-${sid}-${score}" onclick="setOAS('${sid}',${score})"
          style="padding:6px 4px;border-radius:8px;border:2px solid transparent;background:${bg};color:${clr};font-size:10px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;line-height:1.3;text-align:center">
          <div style="font-size:13px;font-weight:800">${score}</div>
          <div style="font-size:9px;margin-top:2px;opacity:.85">${desc.length>20?desc.slice(0,18)+'…':desc}</div>
        </button>`).join('')}
      </div>
    </div>`).join('')}
    <div id="oas-detail" style="font-size:11px;color:var(--text3);padding:8px 10px;background:#fff;border-radius:6px;border:1px solid var(--border);display:none"></div>
  </div>
  <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:14px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div>
        <div style="font-size:13px;font-weight:700">📋 แบบติดตาม 10 ด้าน</div>
        <div style="font-size:11px;color:var(--text3)">แบบติดตามผู้ป่วยจิตเวชเรื้อรังในชุมชน (คะแนน 10–30)</div>
      </div>
      <span id="a10-badge" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#f3f4f6;color:var(--text3)">ยังไม่ประเมิน</span>
    </div>
    ${ASSESS10_DOMAINS.map(({id,title,opts})=>`
    <div style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:8px;border:1px solid var(--border)">
      <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:var(--text1)">${title}</div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px">
        ${opts.map(([score,label,desc])=>`
        <button type="button" id="a10-${id}-${score}" onclick="setAssess10('${id}',${score})"
          style="padding:6px 4px;border-radius:8px;border:2px solid #e5e7eb;background:#f9fafb;color:var(--text2);font-size:11px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;line-height:1.3;text-align:center">
          <div style="font-size:13px;font-weight:800;margin-bottom:2px">${score}</div>
          <div style="font-size:10px;font-weight:700">${label}</div>
          <div style="font-size:9px;opacity:.7;margin-top:1px">${desc.length>18?desc.slice(0,16)+'…':desc}</div>
        </button>`).join('')}
      </div>
    </div>`).join('')}
    <div id="a10-result" style="display:none;margin-top:4px;padding:12px 14px;border-radius:10px;font-size:13px;font-weight:700;text-align:center"></div>
  </div>`:''}

  ${type==='aosomo'?`
  <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:14px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700">🚩 แบบประเมิน 5 Red Flags</div>
      <span id="rf-badge" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#f3f4f6;color:var(--text3)">ไม่พบความเสี่ยง</span>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px">ปัจจัยเสี่ยงอาการทางจิตกำเริบ — กดเลือก "มี" หากพบอาการ</div>
    ${[
      ['rf1','ไม่หลับไม่นอน','มีปัญหาการนอน นอนไม่หลับ ไม่ยอมนอน หลับๆตื่นๆ'],
      ['rf2','เดินไปเดินมา','ผุดลุกผุดนั่ง นั่งไม่ติด เดินไปเดินมา มีพฤติกรรมแปลกๆ'],
      ['rf3','พูดจาคนเดียว','พูด ยิ้ม หัวเราะคนเดียว'],
      ['rf4','หงุดหงิดฉุนเฉียว','อารมณ์แปรปรวน เดี๋ยวดีเดี๋ยวร้าย หงุดหงิดง่าย ฉุนเฉียว'],
      ['rf5','เที่ยวหวาดระแวง','มีอาการหวาดระแวง คิดว่าคนไม่หวังดี นินทาว่าร้าย มีคนคอยติดตามจะทำร้าย'],
    ].map(([id,title,desc])=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:#fff;border-radius:8px;margin-bottom:6px;border:1px solid var(--border)" id="rf-row-${id}">
      <div style="flex:1;min-width:0;margin-right:10px">
        <div style="font-size:13px;font-weight:700;color:var(--text1)">${title}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">${desc}</div>
      </div>
      <div style="display:flex;gap:4px;flex-shrink:0">
        <button type="button" id="rf-yes-${id}" onclick="toggleRedFlag('${id}',true)"
          style="padding:6px 12px;border-radius:6px;border:2px solid #d1d5db;background:#f3f4f6;color:var(--text2);font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">มี</button>
        <button type="button" id="rf-no-${id}" onclick="toggleRedFlag('${id}',false)"
          style="padding:6px 12px;border-radius:6px;border:2px solid var(--primary);background:var(--primary-lt);color:var(--primary);font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">ไม่มี</button>
      </div>
    </div>`).join('')}
    <div id="rf-alert" style="display:none;margin-top:8px;padding:10px 12px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;font-size:12px;color:#b91c1c;font-weight:600">
      ⚠️ พบปัจจัยเสี่ยง! แจ้งญาติ/ผู้ดูแลและเจ้าหน้าที่ รพ.สต. ทันที
    </div>
  </div>
  <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:14px;border:1px solid var(--border)">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:13px;font-weight:700">💊 ยาดี · ญาติดี · ไม่ใช้สารเสพติด</div>
      <span id="yt-badge" style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:#f3f4f6;color:var(--text3)">ยังไม่ประเมิน</span>
    </div>
    ${[
      ['ya','💊 ยา','ผู้ป่วยรับประทานยาตามแพทย์สั่งต่อเนื่อง','ดี','ไม่ดี'],
      ['yati','👨‍👩‍👧 ญาติ','ครอบครัวดูแล ไม่ทอดทิ้ง อยู่ใกล้ชิด','ดี','ไม่ดี'],
      ['sara','🚫 สารเสพติด','ไม่มีการใช้สารเสพติด สุรา บุหรี่เกินขนาด','ไม่ใช้','ใช้'],
    ].map(([key,label,desc,good,bad])=>`
    <div style="background:#fff;border-radius:8px;padding:10px 12px;margin-bottom:8px;border:1px solid var(--border)">
      <div style="font-size:13px;font-weight:700;margin-bottom:2px">${label}</div>
      <div style="font-size:11px;color:var(--text3);margin-bottom:8px">${desc}</div>
      <div style="display:flex;gap:6px">
        <button type="button" id="yt-good-${key}" onclick="setYT('${key}',true)"
          style="flex:1;padding:8px;border-radius:8px;border:2px solid #d1d5db;background:#f3f4f6;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">✅ ${good}</button>
        <button type="button" id="yt-bad-${key}" onclick="setYT('${key}',false)"
          style="flex:1;padding:8px;border-radius:8px;border:2px solid #d1d5db;background:#f3f4f6;color:var(--text2);font-size:13px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">❌ ${bad}</button>
      </div>
    </div>`).join('')}
    <div id="yt-result" style="display:none;margin-top:4px;padding:12px 14px;border-radius:10px;font-size:13px;font-weight:700;text-align:center"></div>
  </div>`:''}

  <div class="form-group"><label>บันทึกเพิ่มเติม</label><textarea id="v-note" rows="3" style="resize:none;font-family:'Sarabun',sans-serif" placeholder="อาการ สิ่งที่พบ ข้อสังเกต..."></textarea></div>
  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--red-lt);border:1px solid var(--red-bd);border-radius:8px;margin-bottom:14px">
    <div><div style="font-size:13px;font-weight:700;color:var(--red)">ต้องการส่งต่อ / รายงานเร่งด่วน</div><div style="font-size:11px;color:var(--text3)">กรณีพบความเสี่ยงสูง</div></div>
    <label class="toggle"><input type="checkbox" id="v-refer"><span class="toggle-slider"></span></label>
  </div>
  <div style="display:flex;gap:10px">
    <button class="btn btn-primary" style="flex:1" id="v-save-btn" onclick="saveVisitRecord()">บันทึกการเยี่ยม</button>
    <button class="btn btn-outline" onclick="closeVisitModal()">ยกเลิก</button>
  </div>`
  ov.style.display='flex'
}
function closeVisitModal(){document.getElementById('visit-overlay').style.display='none'}
function toggleCheck(id){
  const idx=_visitChecks.indexOf(id),cb=document.getElementById('cb-'+id)
  if(idx===-1){_visitChecks.push(id);cb?.classList.add('checked')}else{_visitChecks.splice(idx,1);cb?.classList.remove('checked')}
  updateScore()
}
function updateScore(){
  const cl=_visitType==='staff'?STAFF_CHECKLIST:AOSOMO_CHECKLIST,n=_visitChecks.length,max=cl.length,pct=max>0?n/max:0
  let bg,clr,lbl
  if(pct>=0.8){bg='var(--green-lt)';clr='var(--green)';lbl='ปกติดี'}else if(pct>=0.5){bg='var(--yellow-lt)';clr='var(--yellow)';lbl='พอใช้'}else{bg='var(--red-lt)';clr='var(--red)';lbl='ต้องติดตาม'}
  const b=document.getElementById('score-badge');if(b){b.textContent=`${n}/${max} · ${lbl}`;b.style.background=bg;b.style.color=clr}
}
function setOAS(sid,score){
  _oasScores[sid]=score
  // อัพเดตสไตล์ปุ่มในแถวนั้น
  for(let i=0;i<=3;i++){
    const btn=document.getElementById(`oas-${sid}-${i}`)
    if(btn)btn.style.border=i===score?'2px solid #374151':'2px solid transparent'
  }
  updateOASBadge()
}
function updateOASBadge(){
  const max=Math.max(_oasScores.s1,_oasScores.s2,_oasScores.s3)
  const badge=document.getElementById('oas-badge')
  const detail=document.getElementById('oas-detail')
  const LEVELS=[
    {bg:'#f3f4f6',clr:'var(--text3)',label:'ไม่พบพฤติกรรม',desc:''},
    {bg:'#fef3c7',clr:'#92400e',label:'OAS=1 กึ่งเร่งด่วน',desc:'ต้องจัดการภายใน 24 ชั่วโมง'},
    {bg:'#fee2e2',clr:'var(--red)',label:'OAS=2 เร่งด่วน',desc:'ต้องจัดการภายใน 2 ชั่วโมง'},
    {bg:'#fecaca',clr:'#991b1b',label:'OAS=3 ฉุกเฉิน',desc:'ต้องจัดการทันทีทันใด'},
  ]
  const lv=LEVELS[max]||LEVELS[0]
  if(badge){badge.textContent=lv.label;badge.style.background=lv.bg;badge.style.color=lv.clr}
  if(detail){
    if(max>0){
      detail.style.display='block'
      detail.innerHTML=`⚠️ <strong>${lv.label}</strong> — ${lv.desc}<br>ต่อตนเอง: ${_oasScores.s1} · ต่อผู้อื่น: ${_oasScores.s2} · ต่อทรัพย์สิน: ${_oasScores.s3}`
      detail.style.color=lv.clr
    } else {
      detail.style.display='none'
    }
  }
  // เปิด toggle ส่งต่ออัตโนมัติถ้า OAS >= 2
  const refer=document.getElementById('v-refer')
  if(refer&&max>=2)refer.checked=true
}

function toggleRedFlag(id,found){
  if(found){
    if(!_redFlags.includes(id))_redFlags.push(id)
  }else{
    _redFlags=_redFlags.filter(x=>x!==id)
  }
  const yesBtn=document.getElementById('rf-yes-'+id)
  const noBtn=document.getElementById('rf-no-'+id)
  const row=document.getElementById('rf-row-'+id)
  if(found){
    if(yesBtn){yesBtn.style.background='#fef2f2';yesBtn.style.borderColor='#f87171';yesBtn.style.color='#b91c1c'}
    if(noBtn){noBtn.style.background='#f3f4f6';noBtn.style.borderColor='#d1d5db';noBtn.style.color='var(--text2)'}
    if(row)row.style.borderColor='#f87171'
  }else{
    if(yesBtn){yesBtn.style.background='#f3f4f6';yesBtn.style.borderColor='#d1d5db';yesBtn.style.color='var(--text2)'}
    if(noBtn){noBtn.style.background='var(--primary-lt)';noBtn.style.borderColor='var(--primary)';noBtn.style.color='var(--primary)'}
    if(row)row.style.borderColor='var(--border)'
  }
  const hasRisk=_redFlags.length>0
  const badge=document.getElementById('rf-badge')
  const alert=document.getElementById('rf-alert')
  const refer=document.getElementById('v-refer')
  if(badge){
    badge.textContent=hasRisk?`พบ ${_redFlags.length} ปัจจัยเสี่ยง`:'ไม่พบความเสี่ยง'
    badge.style.background=hasRisk?'#fef2f2':'#f3f4f6'
    badge.style.color=hasRisk?'#b91c1c':'var(--text3)'
  }
  if(alert)alert.style.display=hasRisk?'block':'none'
  if(refer&&hasRisk)refer.checked=true
}
function setYT(key, isGood){
  _ytAssess[key]=isGood
  const goodBtn=document.getElementById('yt-good-'+key)
  const badBtn=document.getElementById('yt-bad-'+key)
  const activeStyle='border:2px solid;font-weight:800'
  if(goodBtn){goodBtn.style.background=isGood?'#dcfce7':'#f3f4f6';goodBtn.style.borderColor=isGood?'#16a34a':'#d1d5db';goodBtn.style.color=isGood?'#15803d':'var(--text2)'}
  if(badBtn){badBtn.style.background=!isGood?'#fef2f2':'#f3f4f6';badBtn.style.borderColor=!isGood?'#f87171':'#d1d5db';badBtn.style.color=!isGood?'#b91c1c':'var(--text2)'}
  // คำนวณสีผลลัพธ์
  const {ya,yati,sara}=_ytAssess
  if(ya===null||yati===null||sara===null)return
  const badCount=[ya===false,yati===false,sara===false].filter(Boolean).length
  let color,bg,border,msg
  if(badCount===0){color='#15803d';bg='#dcfce7';border='#86efac';msg='🟢 สีเขียว — ยาดี ญาติดี ไม่ใช้สารเสพติด'}
  else if(badCount===1){color='#92400e';bg='#fef9c3';border='#fde047';msg='🟡 สีเหลือง — มีข้อใดข้อหนึ่งไม่ดี ต้องติดตามภายใน 15 วัน'}
  else{color='#b91c1c';bg='#fef2f2';border='#fca5a5';msg='🔴 สีแดง — เสี่ยงสูง/วิกฤต แจ้งเจ้าหน้าที่ รพ.สต. ทันที';const r=document.getElementById('v-refer');if(r)r.checked=true}
  const badge=document.getElementById('yt-badge')
  const result=document.getElementById('yt-result')
  if(badge){badge.textContent=msg.split(' — ')[0];badge.style.background=bg;badge.style.color=color;badge.style.borderColor=border}
  if(result){result.style.display='block';result.style.background=bg;result.style.border=`1px solid ${border}`;result.style.color=color;result.textContent=msg}
}
function getYTText(){
  const {ya,yati,sara}=_ytAssess
  if(ya===null&&yati===null&&sara===null)return''
  const labels=[ya===null?'ยา:?':ya?'ยา:ดี':'ยา:ไม่ดี',yati===null?'ญาติ:?':yati?'ญาติ:ดี':'ญาติ:ไม่ดี',sara===null?'สาร:?':sara?'สาร:ไม่ใช้':'สาร:ใช้']
  const badCount=[ya===false,yati===false,sara===false].filter(Boolean).length
  const colorLabel=badCount===0?'สีเขียว':badCount===1?'สีเหลือง':'สีแดง'
  return`\n[ยาดี-ญาติดี-สาร] ${labels.join(' ')} → ${colorLabel}`
}
function setAssess10(domainId, score){
  _assess10[domainId]=score
  // อัปเดตปุ่ม
  for(let s=1;s<=3;s++){
    const btn=document.getElementById(`a10-${domainId}-${s}`)
    if(!btn)continue
    const active=s===score
    const colors=s===1?['#dcfce7','#16a34a','#15803d']:s===2?['#fef9c3','#ca8a04','#92400e']:['#fef2f2','#f87171','#b91c1c']
    btn.style.background=active?colors[0]:'#f9fafb'
    btn.style.borderColor=active?colors[1]:'#e5e7eb'
    btn.style.color=active?colors[2]:'var(--text2)'
  }
  // คำนวณคะแนนรวม
  const filled=Object.keys(_assess10).length
  const total=Object.values(_assess10).reduce((a,b)=>a+b,0)
  const badge=document.getElementById('a10-badge')
  const result=document.getElementById('a10-result')
  if(filled<10){
    if(badge){badge.textContent=`${filled}/10 ด้าน`;badge.style.background='#f3f4f6';badge.style.color='var(--text3)'}
    return
  }
  let bg,border,color,level
  if(total<=14){bg='#dcfce7';border='#86efac';color='#15803d';level='🟢 ผ่านเกณฑ์ดี'}
  else if(total<=19){bg='#fef9c3';border='#fde047';color='#92400e';level='🟡 ต้องติดตามต่อเนื่อง'}
  else{bg='#fef2f2';border='#fca5a5';color='#b91c1c';level='🔴 ต้องการความช่วยเหลือเร่งด่วน';const r=document.getElementById('v-refer');if(r)r.checked=true}
  if(badge){badge.textContent=`รวม ${total} คะแนน · ${level}`;badge.style.background=bg;badge.style.color=color}
  if(result){result.style.display='block';result.style.background=bg;result.style.border=`1px solid ${border}`;result.style.color=color;result.textContent=`คะแนนรวม ${total}/30 — ${level}`}
}
function getAssess10Text(){
  if(!Object.keys(_assess10).length)return''
  const total=Object.values(_assess10).reduce((a,b)=>a+b,0)
  const level=total<=14?'ผ่านเกณฑ์ดี':total<=19?'ต้องติดตาม':'ต้องการความช่วยเหลือเร่งด่วน'
  const details=ASSESS10_DOMAINS.map(({id,title,opts})=>{
    const s=_assess10[id];if(!s)return null
    const opt=opts.find(o=>o[0]===s);return`${title.split('.')[0]}=${s}(${opt?opt[1]:'?'})`
  }).filter(Boolean).join(' ')
  return`\n[แบบ10ด้าน] รวม ${total}/30 → ${level} | ${details}`
}

function autoFillVillage(name){
  const found=allPatients.find(p=>p.name===name)
  if(found){const sel=document.getElementById('v-village');if(sel)for(const o of sel.options)if(o.value===found.village||o.text===found.village){o.selected=true;break}}
}
async function saveVisitRecord(){
  const name=document.getElementById('v-name')?.value?.trim()
  const village=document.getElementById('v-village')?.value
  const date=document.getElementById('v-date')?.value
  const visitor=document.getElementById('v-visitor')?.value?.trim()||''
  const note=document.getElementById('v-note')?.value?.trim()||''
  const refer=document.getElementById('v-refer')?.checked||false
  const btn=document.getElementById('v-save-btn')
  if(!name||!date){alert('กรุณากรอกชื่อและวันที่');return}
  const found=allPatients.find(p=>p.name===name)
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  // รวม OAS ลงใน note ถ้าเป็น staff
  const oasMax=Math.max(_oasScores.s1,_oasScores.s2,_oasScores.s3)
  const oasText=_visitType==='staff'&&oasMax>0
    ?`\n[OAS=${oasMax}] ต่อตนเอง:${_oasScores.s1} ต่อผู้อื่น:${_oasScores.s2} ต่อทรัพย์สิน:${_oasScores.s3}`
    :''
  // รวม Red Flags ลงใน note ถ้าเป็น aosomo
  const RF_LABELS={rf1:'ไม่หลับไม่นอน',rf2:'เดินไปเดินมา',rf3:'พูดจาคนเดียว',rf4:'หงุดหงิดฉุนเฉียว',rf5:'หวาดระแวง'}
  const rfText=_visitType==='aosomo'&&_redFlags.length>0
    ?`\n[5 Red Flags] พบ: ${_redFlags.map(id=>RF_LABELS[id]).join(', ')}`
    :''
  const ytText=_visitType==='aosomo'?getYTText():''
  const a10Text=_visitType==='staff'?getAssess10Text():''
  const fullNote=(note+oasText+rfText+ytText+a10Text).trim()
  try{
    const{error}=await sb.from('home_visits').insert({patient_id:found?.id||null,patient_name:name,village,visit_type:_visitType,visit_date:date,visitor,checks_json:JSON.stringify(_visitChecks),score:_visitChecks.length,note:fullNote,refer})
    if(error)throw error
    sendLineVisitReport({patient_name:name,village,visit_type:_visitType,visit_date:date,visitor,score:_visitChecks.length,refer})
    closeVisitModal()
    if(location.hash==='#visit')navigate('visit')
  }catch(e){btn.textContent='❌ '+e.message;btn.disabled=false}
}

// ─── Auth ────────────────────────────────────────────────────────
function showAuthWall(mode='login'){
  const wall=document.getElementById('auth-wall')
  const ct=document.getElementById('auth-content')
  wall.style.display='flex'
  if(mode==='login'){
    ct.innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:40px;margin-bottom:6px">🏥</div>
      <div style="font-size:22px;font-weight:800;color:var(--primary)">JitHome</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">ระบบติดตามผู้ป่วยจิตเวช</div>
    </div>
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--text1)">เข้าสู่ระบบ</div>
    <div class="form-group"><label>Email</label><input type="email" id="auth-email" placeholder="example@email.com" autocomplete="email"></div>
    <div class="form-group"><label>รหัสผ่าน</label><input type="password" id="auth-password" placeholder="รหัสผ่าน" onkeydown="if(event.key==='Enter')loginUser()"></div>
    <div style="text-align:right;margin-top:-8px;margin-bottom:10px"><a href="#" onclick="showAuthWall('forgot');return false" style="font-size:12px;color:var(--text3)">ลืมรหัสผ่าน?</a></div>
    <div id="auth-error" style="color:var(--red);font-size:12px;margin-bottom:10px;min-height:16px"></div>
    <button class="btn btn-primary btn-block" id="auth-btn" onclick="loginUser()">เข้าสู่ระบบ</button>
    <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text3)">ยังไม่มีบัญชี? <a href="#" onclick="showAuthWall('register');return false" style="color:var(--primary);font-weight:700">สมัครสมาชิก</a></div>`
  } else if(mode==='forgot'){
    ct.innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:40px;margin-bottom:6px">🔑</div>
      <div style="font-size:22px;font-weight:800;color:var(--primary)">JitHome</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">รีเซ็ตรหัสผ่าน</div>
    </div>
    <div style="font-size:16px;font-weight:700;margin-bottom:8px;color:var(--text1)">ลืมรหัสผ่าน</div>
    <div style="font-size:13px;color:var(--text3);margin-bottom:16px">กรอก Email ที่ใช้สมัคร ระบบจะส่งลิงค์รีเซ็ตรหัสผ่านให้</div>
    <div class="form-group"><label>Email</label><input type="email" id="auth-email" placeholder="example@email.com" autocomplete="email" onkeydown="if(event.key==='Enter')sendResetEmail()"></div>
    <div id="auth-error" style="font-size:12px;margin-bottom:10px;min-height:16px"></div>
    <button class="btn btn-primary btn-block" id="auth-btn" onclick="sendResetEmail()">ส่งลิงค์รีเซ็ตรหัสผ่าน</button>
    <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text3)"><a href="#" onclick="showAuthWall('login');return false" style="color:var(--primary);font-weight:700">← กลับหน้าเข้าสู่ระบบ</a></div>`
  } else if(mode==='reset'){
    ct.innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:40px;margin-bottom:6px">🔒</div>
      <div style="font-size:22px;font-weight:800;color:var(--primary)">JitHome</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">ตั้งรหัสผ่านใหม่</div>
    </div>
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--text1)">ตั้งรหัสผ่านใหม่</div>
    <div class="form-group"><label>รหัสผ่านใหม่</label><input type="password" id="auth-password" placeholder="อย่างน้อย 6 ตัวอักษร"></div>
    <div class="form-group"><label>ยืนยันรหัสผ่านใหม่</label><input type="password" id="auth-password2" placeholder="พิมพ์รหัสผ่านอีกครั้ง" onkeydown="if(event.key==='Enter')resetPassword()"></div>
    <div id="auth-error" style="color:var(--red);font-size:12px;margin-bottom:10px;min-height:16px"></div>
    <button class="btn btn-primary btn-block" id="auth-btn" onclick="resetPassword()">บันทึกรหัสผ่านใหม่</button>`
  } else {
    ct.innerHTML=`
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:40px;margin-bottom:6px">🏥</div>
      <div style="font-size:22px;font-weight:800;color:var(--primary)">JitHome</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">ระบบติดตามผู้ป่วยจิตเวช</div>
    </div>
    <div style="font-size:16px;font-weight:700;margin-bottom:16px;color:var(--text1)">สมัครสมาชิก</div>
    <div class="form-group"><label>Email</label><input type="email" id="auth-email" placeholder="example@email.com" autocomplete="email"></div>
    <div class="form-group"><label>รหัสผ่าน</label><input type="password" id="auth-password" placeholder="อย่างน้อย 6 ตัวอักษร"></div>
    <div class="form-group"><label>ยืนยันรหัสผ่าน</label><input type="password" id="auth-password2" placeholder="พิมพ์รหัสผ่านอีกครั้ง" onkeydown="if(event.key==='Enter')registerUser()"></div>
    <div id="auth-error" style="color:var(--red);font-size:12px;margin-bottom:10px;min-height:16px"></div>
    <button class="btn btn-primary btn-block" id="auth-btn" onclick="registerUser()">สมัครสมาชิก</button>
    <div style="text-align:center;margin-top:16px;font-size:13px;color:var(--text3)">มีบัญชีแล้ว? <a href="#" onclick="showAuthWall('login');return false" style="color:var(--primary);font-weight:700">เข้าสู่ระบบ</a></div>`
  }
}

function hideAuthWall(){
  const wall=document.getElementById('auth-wall')
  if(wall)wall.style.display='none'
}

async function loginUser(){
  const email=(document.getElementById('auth-email')?.value||'').trim()
  const password=document.getElementById('auth-password')?.value||''
  const btn=document.getElementById('auth-btn')
  const err=document.getElementById('auth-error')
  if(!email||!password){err.textContent='กรุณากรอก Email และรหัสผ่าน';return}
  btn.disabled=true;btn.textContent='กำลังเข้าสู่ระบบ...'
  const{data,error}=await sb.auth.signInWithPassword({email,password})
  if(error){err.textContent='❌ '+(error.message==='Invalid login credentials'?'Email หรือรหัสผ่านไม่ถูกต้อง':error.message);btn.disabled=false;btn.textContent='เข้าสู่ระบบ';return}
  currentUser=data.user
  await loadProfile(data.user)
  await updateLastLogin(data.user.id)
  hideAuthWall()
  updateUserUI()
  await loadAndNav()
}

async function registerUser(){
  const email=(document.getElementById('auth-email')?.value||'').trim()
  const password=document.getElementById('auth-password')?.value||''
  const password2=document.getElementById('auth-password2')?.value||''
  const btn=document.getElementById('auth-btn')
  const err=document.getElementById('auth-error')
  if(!email||!password){err.textContent='กรุณากรอก Email และรหัสผ่าน';return}
  if(password.length<6){err.textContent='รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';return}
  if(password!==password2){err.textContent='รหัสผ่านไม่ตรงกัน';return}
  btn.disabled=true;btn.textContent='กำลังสมัคร...'
  const{data,error}=await sb.auth.signUp({email,password})
  if(error){err.textContent='❌ '+error.message;btn.disabled=false;btn.textContent='สมัครสมาชิก';return}
  if(data.user&&!data.session){
    err.style.color='var(--green)';err.textContent='✅ สมัครสำเร็จ! กรุณายืนยัน Email ก่อนเข้าสู่ระบบ'
    btn.disabled=false;btn.textContent='สมัครสมาชิก';return
  }
  currentUser=data.user
  await loadProfile(data.user)
  hideAuthWall()
  updateUserUI()
  await loadAndNav()
}

async function logoutUser(){
  await sb.auth.signOut()
  currentUser=null;currentRole='viewer'
  showAuthWall('login')
}

// ─── Profile / Role ──────────────────────────────────────────────
async function loadProfile(user){
  const{data}=await sb.from('user_profiles').select('*').eq('id',user.id).single()
  if(data){
    currentRole=data.role
    currentDisplayName=data.display_name||user.email.split('@')[0]
    currentVillage=data.village||''
    return data
  }
  // ถ้ายังไม่มี profile → สร้างใหม่ (คนแรกเป็น admin)
  const{count}=await sb.from('user_profiles').select('*',{count:'exact',head:true})
  const role=count===0?'admin':'viewer'
  const dn=user.email.split('@')[0]
  const profile={id:user.id,email:user.email,display_name:dn,role,village:'',last_login:new Date().toISOString()}
  await sb.from('user_profiles').insert(profile)
  currentRole=role;currentDisplayName=dn;currentVillage=''
  return profile
}

async function updateLastLogin(userId){
  await sb.from('user_profiles').update({last_login:new Date().toISOString()}).eq('id',userId)
}

async function sendResetEmail(){
  const email=(document.getElementById('auth-email')?.value||'').trim()
  const btn=document.getElementById('auth-btn')
  const err=document.getElementById('auth-error')
  if(!email){err.style.color='var(--red)';err.textContent='กรุณากรอก Email';return}
  btn.disabled=true;btn.textContent='กำลังส่ง...'
  const{error}=await sb.auth.resetPasswordForEmail(email,{
    redirectTo:'https://songkon202-sara.github.io/jithomenew/'
  })
  if(error){err.style.color='var(--red)';err.textContent='❌ '+error.message;btn.disabled=false;btn.textContent='ส่งลิงค์รีเซ็ตรหัสผ่าน';return}
  err.style.color='var(--green)';err.textContent='✅ ส่ง Email สำเร็จ! กรุณาตรวจสอบ Inbox (และ Spam)'
  btn.textContent='ส่งแล้ว ✅';btn.disabled=true
}

async function resetPassword(){
  const password=document.getElementById('auth-password')?.value||''
  const password2=document.getElementById('auth-password2')?.value||''
  const btn=document.getElementById('auth-btn')
  const err=document.getElementById('auth-error')
  if(password.length<6){err.textContent='รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';return}
  if(password!==password2){err.textContent='รหัสผ่านไม่ตรงกัน';return}
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  const{error}=await sb.auth.updateUser({password})
  if(error){err.textContent='❌ '+error.message;btn.disabled=false;btn.textContent='บันทึกรหัสผ่านใหม่';return}
  err.style.color='var(--green)';err.textContent='✅ เปลี่ยนรหัสผ่านสำเร็จ!'
  setTimeout(async()=>{hideAuthWall();await loadAndNav()},1500)
}

function updateUserUI(){
  const av=document.querySelector('.avatar')
  if(av&&currentUser?.email){
    const initials=(currentDisplayName||currentUser.email).slice(0,2).toUpperCase()
    av.textContent=initials
    av.title=`${currentDisplayName||currentUser.email}\nสิทธิ์: ${ROLE_LABEL[currentRole]||currentRole}`
    av.style.cursor='default'
    av.style.background=ROLE_COLOR[currentRole]||'var(--primary)'
    av.onclick=null
  }
  const sideInfo=document.getElementById('sidebar-user-info')
  if(sideInfo&&currentUser){
    sideInfo.textContent=`${currentDisplayName||currentUser.email} · ${ROLE_LABEL[currentRole]||currentRole}`
    sideInfo.title=currentUser.email
  }
  // ซ่อนเมนูตามสิทธิ์
  document.querySelectorAll('[data-page="admin"]').forEach(el=>{
    el.style.display=canDo('admin')?'':'none'
  })
  // viewer เห็นเฉพาะเมนู overview
  const isViewer = currentRole==='viewer' && !_previewOrigRole
  ;['dashboard','patients','timeline','visit','members','guide'].forEach(p=>{
    document.querySelectorAll(`[data-page="${p}"]`).forEach(el=>{
      el.style.display=isViewer?'none':''
    })
  })
}

// ─── Add Patient ─────────────────────────────────────────────────
function openAddPatient(){
  const ov=document.getElementById('addpt-overlay')
  const ct=document.getElementById('addpt-content')
  if(!ov||!ct)return
  ct.innerHTML=`
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div style="font-size:17px;font-weight:700">➕ เพิ่มผู้ป่วยใหม่</div>
    <button onclick="closeAddPatient()" style="background:none;border:none;cursor:pointer;color:var(--text3)"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
  </div>
  <div style="background:#f0f9ff;border:1.5px dashed #38bdf8;border-radius:10px;padding:12px 14px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:10px">
    <div>
      <div style="font-size:13px;font-weight:700;color:#0369a1">📥 นำเข้าหลายรายชื่อจากไฟล์</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">Excel / CSV — นำเข้าได้ครั้งละหลายร้อยราย</div>
    </div>
    <div style="display:flex;gap:6px;flex-shrink:0">
      <button onclick="downloadTemplate('patient')" style="padding:6px 10px;background:#fff;color:#0369a1;border:1px solid #38bdf8;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">⬇️ ตัวอย่าง</button>
      <button onclick="document.getElementById('addpt-import-input').click()" style="padding:6px 10px;background:#0369a1;color:#fff;border:none;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif">📂 เลือกไฟล์</button>
    </div>
    <input type="file" id="addpt-import-input" accept=".xlsx,.xls,.csv" style="display:none" onchange="importPatientFile(this);closeAddPatient()">
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px">
    <div style="flex:1;height:1px;background:var(--border)"></div>
    <div style="font-size:11px;color:var(--text3);white-space:nowrap">— หรือเพิ่มทีละราย —</div>
    <div style="flex:1;height:1px;background:var(--border)"></div>
  </div>
  <div class="form-group"><label>ชื่อ-นามสกุล *</label><input type="text" id="np-name" placeholder="เช่น นายสมชาย ใจดี"></div>
  <div class="form-group"><label>หมู่บ้าน</label><select id="np-village">${['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต'].map(v=>`<option>${v}</option>`).join('')}</select></div>
  <div class="form-group"><label>กลุ่มสี</label>
    <select id="np-group">
      <option value="yellow">🟡 กลุ่มสีเหลือง</option>
      <option value="red">🔴 กลุ่มสีแดง</option>
      <option value="green">🟢 กลุ่มสีเขียว</option>
    </select>
  </div>
  <div class="form-group"><label>วันที่ฉีดยาล่าสุด (ถ้ามี)</label><input type="date" id="np-date" value="${todayISO()}"></div>
  <div class="form-group"><label>รอบนัดต่อไป</label><select id="np-interval"><option>2 สัปดาห์</option><option>3 สัปดาห์</option><option>4 สัปดาห์</option><option selected>1 เดือน</option><option>3 เดือน</option></select></div>
  <div class="form-group"><label>หมายเหตุ</label><input type="text" id="np-note" placeholder="บันทึกเพิ่มเติม..."></div>
  <div class="form-group">
    <label>🪪 เลขบัตรประชาชน <span style="font-size:11px;color:var(--text3);font-weight:400">(13 หลัก — แสดงเฉพาะ admin)</span></label>
    <input type="text" id="np-nid" placeholder="X-XXXX-XXXXX-XX-X" maxlength="17" inputmode="numeric"
      oninput="this.value=formatNationalIdInput(this.value)"
      style="letter-spacing:1px">
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
    <div class="form-group"><label>🏡 เยี่ยมบ้านทุก (เดือน)</label><select id="np-visit-interval">
      <option value="">— ไม่ระบุ —</option>
      ${[1,2,3,6].map(n=>`<option value="${n}">${n} เดือน</option>`).join('')}
    </select></div>
    <div class="form-group"><label>💉 ฉีดยาทุก (เดือน)</label><select id="np-inject-interval">
      <option value="">— ไม่ระบุ —</option>
      ${[1,2,3,6].map(n=>`<option value="${n}">${n} เดือน</option>`).join('')}
    </select></div>
  </div>
  <div class="form-group"><label>💊 รายการยาที่ฉีด</label><input type="text" id="np-medication" placeholder="เช่น Invega 100mg, DEPO-A, Flupentixol 40mg"></div>
  <div style="display:flex;gap:10px;margin-top:4px">
    <button class="btn btn-primary" style="flex:1" id="np-btn" onclick="saveNewPatient()">บันทึกผู้ป่วย</button>
    <button class="btn btn-outline" onclick="closeAddPatient()">ยกเลิก</button>
  </div>`
  ov.style.display='flex'
  setTimeout(()=>document.getElementById('np-name')?.focus(),100)
}

function closeAddPatient(){document.getElementById('addpt-overlay').style.display='none'}

function previewFile(input){
  const file=input.files[0]
  const label=document.getElementById('np-file-label')
  const wrap=document.getElementById('np-file-wrap')
  if(!file){label.textContent='กดเพื่อเลือกไฟล์';return}
  if(file.size>10*1024*1024){alert('ไฟล์ใหญ่เกิน 10 MB');input.value='';return}
  label.textContent=`✅ ${file.name} (${(file.size/1024).toFixed(0)} KB)`
  wrap.style.borderColor='var(--primary)'
}

async function saveNewPatient(){
  const name=(document.getElementById('np-name')?.value||'').trim()
  const village=document.getElementById('np-village')?.value||'หมู่ 1'
  const gc=document.getElementById('np-group')?.value||'yellow'
  const date=document.getElementById('np-date')?.value
  const interval=document.getElementById('np-interval')?.value||'1 เดือน'
  const note=(document.getElementById('np-note')?.value||'').trim()
  const national_id=(document.getElementById('np-nid')?.value||'').replace(/\D/g,'')
  const visit_interval=parseInt(document.getElementById('np-visit-interval')?.value)||null
  const inject_interval=parseInt(document.getElementById('np-inject-interval')?.value)||null
  const medication_name=(document.getElementById('np-medication')?.value||'').trim()||null
  const btn=document.getElementById('np-btn')
  if(!name){alert('กรุณากรอกชื่อ-นามสกุล');document.getElementById('np-name')?.focus();return}
  const gl={red:'สุขภาพจิต กลุ่ม สีแดง',yellow:'สุขภาพจิต กลุ่ม สีเหลือง',green:'สุขภาพจิต กลุ่ม สีเขียว'}[gc]
  btn.disabled=true;btn.textContent='กำลังบันทึก...'
  try{
    const{error:pe}=await sb.from('patients').insert({name,village,national_id,visit_interval,inject_interval,medication_name})
    if(pe)throw pe
    if(date){
      const{data:found}=await sb.from('patients').select('id').eq('name',name).single()
      if(found){
        await sb.from('injection_records').insert({patient_id:found.id,injection_date:date,group_color:gc,group_label:gl,interval_str:interval,interval_days:parseInterval(interval),note})
      }
    }
    btn.textContent='✅ บันทึกสำเร็จ'
    allPatients=await getPatients()
    setTimeout(()=>{closeAddPatient();navigate('patients')},1200)
  }catch(e){
    const msg=e.message?.includes('duplicate')||e.message?.includes('unique')?'มีชื่อนี้ในระบบแล้ว':e.message
    btn.textContent='❌ '+msg;btn.disabled=false
  }
}

// ─── Init ────────────────────────────────────────────────────────
async function loadAndNav(){
  try{
    const s=await getSettings()
    if(s.hospital_name){hospitalName=s.hospital_name;document.getElementById('header-sub').textContent=s.hospital_name}
    const{count}=await sb.from('patient_status').select('*',{count:'exact',head:true}).lt('days_until',0)
    if(count){const b=document.getElementById('notif-badge');if(b){b.textContent=count;b.style.display='flex'}}
  }catch(e){console.warn('loadAndNav:',e)}
  const hash=(location.hash||'').slice(1)
  const startPage = currentRole==='viewer' ? 'overview' : (PAGES.includes(hash)?hash:'dashboard')
  await navigate(startPage)
}

async function init(){
  // ดัก PASSWORD_RECOVERY event เท่านั้น (ไม่ดัก SIGNED_IN เพื่อป้องกัน double-execute)
  sb.auth.onAuthStateChange((event) => {
    if(event === 'PASSWORD_RECOVERY') showAuthWall('reset')
  })

  // ตรวจ URL สำหรับ recovery link (รองรับทั้ง hash และ query string)
  const url = window.location.href
  const hash = window.location.hash
  if(url.includes('type=recovery') || hash.includes('type=recovery')){
    await new Promise(r => setTimeout(r, 300))
    const{data:{session}}=await sb.auth.getSession()
    if(session){showAuthWall('reset');return}
  }

  const{data:{user}}=await sb.auth.getUser()
  if(!user){showAuthWall('login');return}
  currentUser=user
  await loadProfile(user)
  await updateLastLogin(user.id)
  updateUserUI()
  await loadAndNav()
}

window.addEventListener('hashchange',()=>{const p=(location.hash||'').slice(1);if(PAGES.includes(p))navigate(p)})
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeVisitModal();closeAddPatient()}})
document.addEventListener('DOMContentLoaded',init)
