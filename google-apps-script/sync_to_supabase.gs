// ═══════════════════════════════════════════════════════════════
// JitHome — Google Apps Script: Auto-Sync ไปยัง Supabase
// วิธีใช้: Extensions → Apps Script → วางโค้ดนี้ → Save → Run setupTrigger
// ═══════════════════════════════════════════════════════════════

const SUPABASE_URL  = 'https://drwnsumijarzqezljare.supabase.co'
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyd25zdW1pamFyenFlemxqYXJlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2NDI1NzgsImV4cCI6MjA5NTIxODU3OH0.lv_Uf8rAzBNWuVbL7Q7oxRchWTcvnmmbHLtOiaqFIpQ'
const SHEET_NAME    = 'Sheet1'  // เปลี่ยนถ้าชื่อ Sheet ต่างออกไป

// ─── ตั้งค่า Trigger อัตโนมัติ (รันครั้งเดียว) ──────────────────
function setupTrigger() {
  // ลบ trigger เก่าทิ้งก่อน
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t))

  // สร้าง trigger ใหม่: ทุกครั้งที่แก้ไข Sheet → syncRow
  ScriptApp.newTrigger('onSheetEdit')
    .forSpreadsheet(SpreadsheetApp.getActive())
    .onEdit()
    .create()

  SpreadsheetApp.getUi().alert('✅ ตั้งค่า Auto-Sync สำเร็จ!\nทุกครั้งที่แก้ไขข้อมูล จะ sync ไป Supabase อัตโนมัติ')
}

// ─── Trigger: เมื่อแก้ไขแถวใดแถวหนึ่ง ────────────────────────────
function onSheetEdit(e) {
  try {
    const sheet = e.range.getSheet()
    if (sheet.getName() !== SHEET_NAME) return

    const row = e.range.getRow()
    if (row <= 1) return  // ข้าม header

    syncRow(sheet, row)
  } catch (err) {
    Logger.log('onSheetEdit error: ' + err.message)
  }
}

// ─── Sync แถวเดียว ──────────────────────────────────────────────
function syncRow(sheet, row) {
  const values = sheet.getRange(row, 1, 1, 7).getValues()[0]
  const [dateRaw, groupRaw, nameRaw, villageRaw, intervalRaw, note1, note2] = values

  const name = String(nameRaw || '').trim()
  if (!name || name === 'ทดสอบ' || name === 'ชื่อ-นามสกุล') return

  const dateISO = parseDate(dateRaw)
  if (!dateISO) return

  const village     = String(villageRaw || '').trim()
  const groupColor  = parseGroupColor(String(groupRaw || ''))
  const groupLabel  = String(groupRaw || '').trim()
  const intervalStr = parseIntervalStr(String(intervalRaw || ''))
  const intervalDays = parseIntervalDays(String(intervalRaw || ''))
  const note        = [String(note1||'').trim(), String(note2||'').trim()].filter(Boolean).join(' · ')

  // 1. Upsert patient
  const patientRes = supabaseFetch('POST', '/rest/v1/patients', {
    name, village
  }, { 'Prefer': 'resolution=ignore-duplicates,return=representation' })

  // 2. ดึง patient_id
  const found = supabaseFetch('GET', `/rest/v1/patients?name=eq.${encodeURIComponent(name)}&select=id`, null)
  if (!found || !found[0]) {
    Logger.log('Patient not found: ' + name)
    return
  }
  const patientId = found[0].id

  // 3. Insert injection record
  supabaseFetch('POST', '/rest/v1/injection_records', {
    patient_id:   patientId,
    injection_date: dateISO,
    group_color:  groupColor,
    group_label:  groupLabel,
    interval_str: intervalStr,
    interval_days: intervalDays,
    note:         note
  }, { 'Prefer': 'return=minimal' })

  Logger.log(`✅ Synced row ${row}: ${name} (${dateISO})`)
}

// ─── Sync ทั้ง Sheet (รันด้วยตนเอง) ─────────────────────────────
function syncAllRows() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_NAME)
  if (!sheet) {
    SpreadsheetApp.getUi().alert('❌ ไม่พบ Sheet ชื่อ: ' + SHEET_NAME)
    return
  }

  const lastRow = sheet.getLastRow()
  let success = 0, skipped = 0, errors = 0

  for (let row = 2; row <= lastRow; row++) {
    try {
      const values = sheet.getRange(row, 1, 1, 7).getValues()[0]
      const name = String(values[2] || '').trim()
      const date = parseDate(values[0])

      if (!name || name === 'ทดสอบ' || !date) {
        skipped++
        continue
      }
      syncRow(sheet, row)
      success++
      Utilities.sleep(200)  // หน่วงเล็กน้อยเพื่อไม่ให้ API limit
    } catch (err) {
      errors++
      Logger.log(`Row ${row} error: ${err.message}`)
    }
  }

  SpreadsheetApp.getUi().alert(
    `✅ Sync เสร็จสิ้น!\n` +
    `สำเร็จ: ${success} รายการ\n` +
    `ข้าม: ${skipped} รายการ\n` +
    `ผิดพลาด: ${errors} รายการ`
  )
}

// ─── Supabase API Helper ──────────────────────────────────────────
function supabaseFetch(method, path, body, extraHeaders) {
  const url = SUPABASE_URL + path
  const headers = {
    'apikey':        SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY,
    'Content-Type':  'application/json',
    ...extraHeaders
  }
  const options = {
    method:             method.toLowerCase(),
    headers:            headers,
    muteHttpExceptions: true
  }
  if (body && method !== 'GET') {
    options.payload = JSON.stringify(body)
  }

  const response = UrlFetchApp.fetch(url, options)
  const text = response.getContentText()
  try {
    return JSON.parse(text || 'null')
  } catch {
    return text
  }
}

// ─── Date Parser (D/M/YYYY หรือ Date object) ─────────────────────
function parseDate(raw) {
  if (!raw) return null

  // ถ้าเป็น Date object จาก Google Sheets
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    const y = raw.getFullYear()
    const m = String(raw.getMonth() + 1).padStart(2, '0')
    const d = String(raw.getDate()).padStart(2, '0')
    // ถ้าปีเป็น พ.ศ. (>2400) ให้แปลงเป็น ค.ศ.
    return `${y > 2400 ? y - 543 : y}-${m}-${d}`
  }

  // ถ้าเป็น string รูปแบบ D/M/YYYY
  const s = String(raw).trim()
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (match) {
    const [_, day, mon, yr] = match
    const year = parseInt(yr) > 2400 ? parseInt(yr) - 543 : parseInt(yr)
    return `${year}-${mon.padStart(2,'0')}-${day.padStart(2,'0')}`
  }
  return null
}

// ─── Group Color Parser ──────────────────────────────────────────
function parseGroupColor(g) {
  if (g.includes('แดง'))   return 'red'
  if (g.includes('เขียว')) return 'green'
  return 'yellow'
}

// ─── Interval Parsers ────────────────────────────────────────────
function parseIntervalStr(s) {
  if (!s) return '1 เดือน'
  if (/3\s*เดือน/.test(s))   return '3 เดือน'
  if (/1\s*เดือน/.test(s))   return '1 เดือน'
  if (/4\s*สัปดาห์?/.test(s)) return '4 สัปดาห์'
  if (/3\s*สัปดาห์?/.test(s)) return '3 สัปดาห์'
  if (/2\s*สัปดาห์?/.test(s)) return '2 สัปดาห์'
  return '1 เดือน'
}

function parseIntervalDays(s) {
  if (/3\s*เดือน/.test(s))   return 90
  if (/1\s*เดือน/.test(s))   return 30
  if (/4\s*สัปดาห์?/.test(s)) return 28
  if (/3\s*สัปดาห์?/.test(s)) return 21
  if (/2\s*สัปดาห์?/.test(s)) return 14
  return 30
}
