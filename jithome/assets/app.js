/* JitHome — Client-side JavaScript */
'use strict';

// ── Patient modal ──────────────────────────────────────────────
async function openModal(patientId) {
  const overlay = document.getElementById('modal-overlay');
  const content = document.getElementById('modal-content');

  overlay.style.display = 'flex';
  content.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">กำลังโหลด...</div>';

  try {
    const res = await fetch('/jithome/api/patients.php?action=detail&id=' + patientId);
    const p   = await res.json();
    if (p.error) throw new Error(p.error);
    content.innerHTML = buildPatientModal(p);
    initModalForm(p);
  } catch (e) {
    content.innerHTML = '<div style="padding:20px;color:var(--red)">เกิดข้อผิดพลาด: ' + e.message + '</div>';
  }
}

function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
}

function buildPatientModal(p) {
  const chip    = daysChip(parseInt(p.days_until));
  const gl      = p.group_label || groupLabel(p.group_color);
  const nextTh  = p.next_th || '';
  const intStr  = p.interval_str || '1 เดือน';
  const note    = p.note ? `<div style="background:var(--yellow-lt);border:1px solid var(--yellow-bd);border-radius:8px;padding:8px 12px;margin-bottom:16px;font-size:12px;color:#92400e">📋 ${esc(p.note)}</div>` : '';

  const historyItems = (p.history || []).slice(0, 8).map((h, i) => {
    const isLast = i === 0;
    const dotClr = isLast ? 'var(--primary)' : 'var(--border)';
    const latest = isLast ? `<span style="font-size:10px;background:var(--primary-lt);color:var(--primary);padding:1px 6px;border-radius:4px;font-weight:700;margin-left:4px">ล่าสุด</span>` : '';
    return `
    <div class="history-item">
      <div class="history-dot" style="background:${dotClr};margin-top:5px"></div>
      <div>
        <div class="history-date">${esc(h.date_th)} ${latest}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">${esc(h.group_label||'')} · ${esc(h.interval_str||'')}</div>
        ${h.note ? `<div class="history-note" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(h.note)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const moreItems = p.history && p.history.length > 8
    ? `<div style="font-size:12px;color:var(--text3);text-align:center;padding-top:8px">+ ${p.history.length - 8} รายการก่อนหน้า</div>`
    : '';

  return `
  <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px">
    <div>
      <div style="font-size:20px;font-weight:700;margin-bottom:4px">${esc(p.name)}</div>
      <div style="font-size:14px;color:var(--text3);margin-bottom:12px">${esc(p.village)} · รพ.สต.สองคอน</div>
    </div>
    <button onclick="closeModal()" style="background:none;border:none;cursor:pointer;color:var(--text3);padding:4px">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
    <span class="badge ${p.group_color}"><span class="badge-dot"></span>${esc(gl)}</span>
    <span class="days-chip ${chip.cls}">${chip.label}</span>
  </div>

  <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:16px">
    <div style="font-size:12px;color:var(--text3);margin-bottom:2px">วันนัดครั้งต่อไป</div>
    <div style="font-size:16px;font-weight:700;color:var(--primary)">${esc(nextTh)}</div>
    <div style="font-size:12px;color:var(--text3);margin-top:2px">รอบการฉีดยา: ${esc(intStr)}</div>
  </div>

  ${note}

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
    <div style="font-size:13px;font-weight:700;color:var(--text)">ประวัติการฉีดยา (${(p.history||[]).length} ครั้ง)</div>
    <button onclick="toggleRecordForm()" style="background:var(--primary);color:#fff;border:none;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:4px;font-family:'Sarabun',sans-serif">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      บันทึก
    </button>
  </div>

  <div id="record-form-wrap" style="display:none;background:var(--primary-lt);border-radius:10px;padding:14px;margin-bottom:12px;border:1px solid rgba(10,126,164,.2)">
    <div style="font-size:13px;font-weight:700;margin-bottom:10px;color:var(--primary)">บันทึกการฉีดยา</div>
    <div class="form-group">
      <label>วันที่ฉีดยา</label>
      <input type="date" id="rec-date">
    </div>
    <div class="form-group">
      <label>รอบนัดต่อไป</label>
      <select id="rec-interval">
        <option>2 สัปดาห์</option><option>3 สัปดาห์</option>
        <option>4 สัปดาห์</option><option value="1 เดือน" selected>1 เดือน</option><option>3 เดือน</option>
      </select>
    </div>
    <div class="form-group">
      <label>หมายเหตุ</label>
      <input type="text" id="rec-note" placeholder="ผลการฉีดยา, อาการ...">
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-primary" style="flex:1" id="rec-save-btn"
        onclick="savePatientRecord(${p.id},'${esc(p.name)}','${esc(p.village)}','${esc(p.group_label||'')}')">บันทึก</button>
      <button class="btn btn-outline" onclick="toggleRecordForm()">ยกเลิก</button>
    </div>
  </div>

  <div>${historyItems}${moreItems}</div>`;
}

function toggleRecordForm() {
  const w = document.getElementById('record-form-wrap');
  if (w) w.style.display = w.style.display === 'none' ? '' : 'none';
}

function initModalForm(p) {
  // Pre-select interval
  const sel = document.getElementById('rec-interval');
  if (sel && p.interval_str) {
    for (const opt of sel.options) {
      if (opt.value === p.interval_str || opt.text === p.interval_str) {
        opt.selected = true; break;
      }
    }
  }
}

async function savePatientRecord(patientId, name, village, groupLabel) {
  const date     = document.getElementById('rec-date')?.value;
  const interval = document.getElementById('rec-interval')?.value;
  const note     = document.getElementById('rec-note')?.value || '';
  const btn      = document.getElementById('rec-save-btn');

  if (!date) { alert('กรุณาเลือกวันที่ฉีดยา'); return; }

  // Map group_label back to Thai group string
  const groupMap = { red: 'สีแดง', yellow: 'สีเหลือง', green: 'สีเขียว' };
  let   groupStr = 'สีเหลือง';
  if (groupLabel.includes('แดง'))  groupStr = 'สีแดง';
  if (groupLabel.includes('เขียว')) groupStr = 'สีเขียว';

  if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }

  try {
    const r = await fetch('/jithome/api/records.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, village, group: groupStr, date, interval, note }),
    });
    const j = await r.json();
    if (j.success) {
      closeModal();
      window.location.reload();
    } else {
      throw new Error(j.error || 'เกิดข้อผิดพลาด');
    }
  } catch (e) {
    if (btn) { btn.textContent = '❌ ' + e.message; btn.disabled = false; }
  }
}

// ── Visit form modal ───────────────────────────────────────────
let _visitChecks = [];
let _visitType   = 'aosomo';

function openVisitForm(type) {
  const overlay = document.getElementById('visit-overlay');
  const content = document.getElementById('visit-content');
  if (!overlay || !content) return;

  _visitType   = type;
  _visitChecks = [];

  const checklist = type === 'staff' ? STAFF_CHECKLIST : AOSOMO_CHECKLIST;
  const title = type === 'staff' ? '🏥 บันทึกเยี่ยมบ้าน (เจ้าหน้าที่)' : '🏡 บันทึกเยี่ยมบ้าน (อสม.)';
  const sub   = type === 'staff' ? 'แบบประเมินสำหรับเจ้าหน้าที่สาธารณสุข' : 'แบบประเมินสำหรับ อสม.';
  const vis   = type === 'staff' ? 'ผู้ออกเยี่ยม (เจ้าหน้าที่)' : 'อสม. ผู้ออกเยี่ยม';
  const vph   = type === 'staff' ? 'ชื่อเจ้าหน้าที่...' : 'ชื่อ อสม....';

  const nameOpts = (typeof PATIENT_NAMES !== 'undefined' ? PATIENT_NAMES : [])
    .map(p => `<option value="${esc(p.name)}">`).join('');

  const checkItems = checklist.map(([id, label]) => `
    <div class="check-item" onclick="toggleCheck('${id}')">
      <div class="check-box" id="cb-${id}">
        <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <span class="check-label">${esc(label)}</span>
    </div>`).join('');

  const today = new Date().toISOString().slice(0, 10);

  content.innerHTML = `
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
    <div>
      <div style="font-size:17px;font-weight:700">${title}</div>
      <div style="font-size:12px;color:var(--text3);margin-top:2px">${sub}</div>
    </div>
    <button onclick="closeVisitModal()" style="background:none;border:none;cursor:pointer;color:var(--text3)">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>

  <div class="form-group">
    <label>ชื่อผู้ป่วย</label>
    <input list="vn-list" id="v-name" placeholder="เลือกหรือพิมพ์ชื่อ" oninput="autoFillVillage(this.value)">
    <datalist id="vn-list">${nameOpts}</datalist>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
    <div class="form-group" style="margin-bottom:0">
      <label>หมู่บ้าน</label>
      <select id="v-village">
        ${['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต'].map(v=>`<option>${v}</option>`).join('')}
      </select>
    </div>
    <div class="form-group" style="margin-bottom:0">
      <label>วันที่เยี่ยม</label>
      <input type="date" id="v-date" value="${today}">
    </div>
  </div>

  <div class="form-group">
    <label>${esc(vis)}</label>
    <input type="text" id="v-visitor" placeholder="${esc(vph)}">
  </div>

  <div style="background:var(--bg);border-radius:10px;padding:10px 14px;margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div style="font-size:13px;font-weight:700">รายการตรวจสอบ</div>
      <span id="score-badge" style="padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:var(--red-lt);color:var(--red)">0/${checklist.length} · ต้องติดตาม</span>
    </div>
    ${checkItems}
  </div>

  <div class="form-group">
    <label>บันทึกเพิ่มเติม / สังเกตพฤติกรรม</label>
    <textarea id="v-note" rows="3" placeholder="อาการ สิ่งที่พบ ข้อสังเกต..." style="resize:none"></textarea>
  </div>

  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--red-lt);border:1px solid var(--red-bd);border-radius:8px;margin-bottom:14px">
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--red)">ต้องการส่งต่อ / รายงานเร่งด่วน</div>
      <div style="font-size:11px;color:var(--text3)">กรณีพบความเสี่ยงสูง หรืออาการกำเริบ</div>
    </div>
    <label class="toggle"><input type="checkbox" id="v-refer"><span class="toggle-slider"></span></label>
  </div>

  <div style="background:var(--primary-lt);border:1.5px solid rgba(10,126,164,.25);border-radius:10px;padding:12px 14px;margin-bottom:14px">
    <div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:8px">📅 วันนัดครั้งต่อไป</div>
    <input type="date" id="v-next" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:var(--radius-sm);font-family:'Sarabun',sans-serif;font-size:14px;color:var(--text);background:#fff;outline:none"
      oninput="showNextAppt(this.value)">
    <div id="next-appt-confirm" style="font-size:11px;color:var(--primary);margin-top:5px;font-weight:600;display:none"></div>
  </div>

  <div style="display:flex;gap:10px">
    <button class="btn btn-primary" style="flex:1" id="v-save-btn" onclick="saveVisit()">บันทึกการเยี่ยม</button>
    <button class="btn btn-outline" onclick="closeVisitModal()">ยกเลิก</button>
  </div>`;

  overlay.style.display = 'flex';
}

function closeVisitModal() {
  document.getElementById('visit-overlay').style.display = 'none';
}

function toggleCheck(id) {
  const idx = _visitChecks.indexOf(id);
  const cb  = document.getElementById('cb-' + id);
  if (idx === -1) {
    _visitChecks.push(id);
    cb?.classList.add('checked');
  } else {
    _visitChecks.splice(idx, 1);
    cb?.classList.remove('checked');
  }
  updateScore();
}

function updateScore() {
  const cl    = _visitType === 'staff' ? STAFF_CHECKLIST : AOSOMO_CHECKLIST;
  const n     = _visitChecks.length;
  const max   = cl.length;
  const pct   = max > 0 ? n / max : 0;
  let bg, clr, lbl;
  if (pct >= 0.8) { bg='var(--green-lt)'; clr='var(--green)'; lbl='ปกติดี'; }
  else if (pct >= 0.5) { bg='var(--yellow-lt)'; clr='var(--yellow)'; lbl='พอใช้'; }
  else { bg='var(--red-lt)'; clr='var(--red)'; lbl='ต้องติดตาม'; }
  const badge = document.getElementById('score-badge');
  if (badge) { badge.textContent = `${n}/${max} · ${lbl}`; badge.style.background = bg; badge.style.color = clr; }
}

function autoFillVillage(name) {
  if (typeof PATIENT_NAMES === 'undefined') return;
  const found = PATIENT_NAMES.find(p => p.name === name);
  if (found) {
    const sel = document.getElementById('v-village');
    if (sel) {
      for (const opt of sel.options) {
        if (opt.value === found.village || opt.text === found.village) { opt.selected = true; break; }
      }
    }
  }
}

function showNextAppt(val) {
  const el = document.getElementById('next-appt-confirm');
  const inp = document.getElementById('v-next');
  if (el && val) {
    const d = new Date(val + 'T00:00:00Z');
    el.textContent = '✅ กำหนดนัด ' + d.toLocaleDateString('th-TH', {year:'numeric',month:'long',day:'numeric',timeZone:'UTC'});
    el.style.display = '';
    if (inp) inp.style.borderColor = 'var(--primary)';
  } else if (el) {
    el.style.display = 'none';
    if (inp) inp.style.borderColor = 'var(--border)';
  }
}

async function saveVisit() {
  const name    = document.getElementById('v-name')?.value;
  const village = document.getElementById('v-village')?.value;
  const date    = document.getElementById('v-date')?.value;
  const visitor = document.getElementById('v-visitor')?.value || '';
  const note    = document.getElementById('v-note')?.value || '';
  const refer   = document.getElementById('v-refer')?.checked || false;
  const next    = document.getElementById('v-next')?.value || null;
  const btn     = document.getElementById('v-save-btn');

  if (!name || !date) { alert('กรุณากรอกชื่อและวันที่'); return; }

  const cl = _visitType === 'staff' ? STAFF_CHECKLIST : AOSOMO_CHECKLIST;

  if (btn) { btn.disabled = true; btn.textContent = 'กำลังบันทึก...'; }

  try {
    const r = await fetch('/jithome/api/visits.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_name: name, village, visit_type: _visitType,
        visit_date: date, visitor, checks: _visitChecks,
        score: _visitChecks.length, note, refer, next_appt: next,
      }),
    });
    const j = await r.json();
    if (j.success) { closeVisitModal(); window.location.reload(); }
    else throw new Error(j.error || 'ผิดพลาด');
  } catch (e) {
    if (btn) { btn.textContent = '❌ ' + e.message; btn.disabled = false; }
  }
}

// ── Utility ────────────────────────────────────────────────────
function daysChip(days) {
  if (days < 0)  return { cls: 'overdue',  label: 'เกินนัด ' + Math.abs(days) + ' วัน' };
  if (days === 0) return { cls: 'today',   label: 'วันนี้' };
  if (days <= 3)  return { cls: 'soon',    label: 'อีก ' + days + ' วัน' };
  return { cls: 'upcoming', label: 'อีก ' + days + ' วัน' };
}

function groupLabel(g) {
  return { red: 'กลุ่มสีแดง', yellow: 'กลุ่มสีเหลือง', green: 'กลุ่มสีเขียว' }[g] || 'กลุ่มสีเหลือง';
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Keyboard: close modal on Escape ───────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeVisitModal(); }
});
