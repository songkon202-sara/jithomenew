'use strict'

// ─── Supabase ────────────────────────────────────────────────────
const SUPABASE_URL = 'https://drwnsumijarzqezljare.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd25zdW1pamFyenFlemxqYXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDI1NzgsImV4cCI6MjA5NTIxODU3OH0.lv_Uf8rAzBNWuVbL7Q7oxRchWTcvnmmbHLtOiaqFIpQ'
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── Constants ───────────────────────────────────────────────────
const TH_MONTHS_S = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
const TH_MONTHS_F = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const PAGES = ['dashboard','patients','timeline','overview','visit','admin']

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

function patientCard(p) {
  const chip = daysChip(p.days_until)
  const over = parseInt(p.days_until) < 0
  const gl   = p.group_label || groupLabel(p.group_color)
  const cls  = `patient-card ${p.group_color}${over?' overdue':''} fade-up`
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
    ${note}
  </div>`
}

// ─── Data ────────────────────────────────────────────────────────
async function getPatients() {
  const { data, error } = await sb.from('patient_status').select('*').order('days_until')
  if (error) { console.error(error); return [] }
  return (data||[]).map(p => ({ ...p, group_label: groupLabel(p.group_color) }))
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
  document.querySelectorAll('[data-page]').forEach(el => el.classList.toggle('active', el.dataset.page === page))
  const titles = {
    dashboard:['JitHome','ระบบติดตามผู้ป่วยจิตเวช'],
    patients: ['ผู้ป่วยทั้งหมด','รายชื่อและสถานะ'],
    timeline: ['ตารางนัดหมาย','เรียงตามวันที่'],
    overview: ['ภาพรวม','สถิติและกราฟ'],
    visit:    ['เยี่ยมบ้าน','บันทึกการเยี่ยม'],
    admin:    ['แอดมิน','จัดการและตั้งค่า'],
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
  history.replaceState(null,'','#'+page)
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
  <div class="page-title">ผู้ป่วยทั้งหมด</div>
  <div class="page-sub">${pts.length} ราย · ${esc(hospitalName)}</div>
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
  const trends=await getTrend()
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
  // Line chart
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
  el.innerHTML=`<div class="page">
  <div class="page-title">แอดมิน</div>
  <div class="page-sub">จัดการข้อมูลและตั้งค่าระบบ</div>
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
      <input type="text" value="${esc(settings.line_token||'')}" placeholder="LINE Access Token" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace">
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0088cc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">T</div>
          <div><div style="font-size:13px;font-weight:700">Telegram Bot</div><div style="font-size:11px;color:var(--text3)">${esc(settings.telegram_bot||'@JitHomeBot')} · กลุ่มแจ้งเตือน</div></div>
        </div>
        <label class="toggle"><input type="checkbox" ${settings.telegram_enabled==='1'?'checked':''} onchange="toggleSetting('telegram_enabled',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <input type="text" value="${esc(settings.telegram_chatid||'')}" placeholder="Chat ID เช่น -1001234567890" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace">
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
  </div>`
}

async function toggleSetting(key,val){
  await sb.from('app_settings').upsert({setting_key:key,setting_value:val?'1':'0'},{onConflict:'setting_key'})
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
    const chip=daysChip(parseInt(p.days_until))
    const histHtml=hist.slice(0,8).map((h,i)=>`
    <div class="history-item">
      <div class="history-dot" style="background:${i===0?'var(--primary)':'var(--border)'};margin-top:5px"></div>
      <div>
        <div class="history-date">${esc(h.date_th)}${i===0?` <span style="font-size:10px;background:var(--primary-lt);color:var(--primary);padding:1px 6px;border-radius:4px;font-weight:700">ล่าสุด</span>`:''}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">${esc(h.group_label||'')} · ${esc(h.interval_str||'')}</div>
        ${h.note?`<div class="history-note">${esc(h.note)}</div>`:''}
      </div>
    </div>`).join('')
    ct.innerHTML=`
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
      <div><div style="font-size:20px;font-weight:700;margin-bottom:4px">${esc(p.name)}</div><div style="font-size:14px;color:var(--text3)">${esc(p.village||'')} · ${esc(hospitalName)}</div></div>
      <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      <span class="badge ${p.group_color}"><span class="badge-dot"></span>${esc(p.group_label)}</span>
      <span class="days-chip ${chip.cls}">${chip.label}</span>
    </div>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:16px">
      <div style="font-size:12px;color:var(--text3);margin-bottom:2px">วันนัดครั้งต่อไป</div>
      <div style="font-size:16px;font-weight:700;color:var(--primary)">${thDateFull(p.next_date)}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">รอบการฉีดยา: ${esc(p.interval_str||'')}</div>
    </div>
    ${p.note?`<div style="background:var(--yellow-lt);border:1px solid var(--yellow-bd);border-radius:8px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:#92400e">📋 ${esc(p.note)}</div>`:''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700">ประวัติการฉีดยา (${hist.length} ครั้ง)</div>
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
  _visitType=type;_visitChecks=[]
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
  <div class="form-group"><label>${type==='staff'?'ผู้ออกเยี่ยม (เจ้าหน้าที่)':'อสม. ผู้ออกเยี่ยม'}</label><input type="text" id="v-visitor" placeholder="${type==='staff'?'ชื่อเจ้าหน้าที่...':'ชื่อ อสม....'}"></div>
  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700">รายการตรวจสอบ</div>
      <span id="score-badge" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:var(--red-lt);color:var(--red)">0/${cl.length} · ต้องติดตาม</span>
    </div>
    ${cl.map(([id,lbl])=>`<div class="check-item" onclick="toggleCheck('${id}')"><div class="check-box" id="cb-${id}"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div><span class="check-label">${esc(lbl)}</span></div>`).join('')}
  </div>
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
  try{
    const{error}=await sb.from('home_visits').insert({patient_id:found?.id||null,patient_name:name,village,visit_type:_visitType,visit_date:date,visitor,checks_json:JSON.stringify(_visitChecks),score:_visitChecks.length,note,refer})
    if(error)throw error
    closeVisitModal()
    if(location.hash==='#visit')navigate('visit')
  }catch(e){btn.textContent='❌ '+e.message;btn.disabled=false}
}

// ─── Init ────────────────────────────────────────────────────────
async function init(){
  try{
    const s=await getSettings()
    if(s.hospital_name){hospitalName=s.hospital_name;document.getElementById('header-sub').textContent=s.hospital_name}
    const{count}=await sb.from('patient_status').select('*',{count:'exact',head:true}).lt('days_until',0)
    if(count){const b=document.getElementById('notif-badge');if(b){b.textContent=count;b.style.display='flex'}}
  }catch(e){console.warn('init:',e)}
  const hash=(location.hash||'').slice(1)
  await navigate(PAGES.includes(hash)?hash:'dashboard')
}

window.addEventListener('hashchange',()=>{const p=(location.hash||'').slice(1);if(PAGES.includes(p))navigate(p)})
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeModal();closeVisitModal()}})
document.addEventListener('DOMContentLoaded',init)
