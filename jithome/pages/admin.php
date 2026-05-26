<?php
// ─── Admin Page ────────────────────────────────────────────────
$patients  = getAllPatients($db);
$pNames    = getPatientNames($db);
$settings  = $db->query('SELECT setting_key, setting_value FROM settings')->fetchAll(PDO::FETCH_KEY_PAIR);

$total   = count($patients);
$redC    = count(array_filter($patients, fn($p) => $p['group_color'] === 'red'));
$yellowC = count(array_filter($patients, fn($p) => $p['group_color'] === 'yellow'));
$greenC  = count(array_filter($patients, fn($p) => $p['group_color'] === 'green'));
$overdueC= count(array_filter($patients, fn($p) => (int)$p['days_until'] < 0));
$todayC  = count(array_filter($patients, fn($p) => (int)$p['days_until'] === 0));
?>

<div class="page">
  <div class="page-title">แอดมิน</div>
  <div class="page-sub">จัดการข้อมูลและตั้งค่าระบบ</div>

  <!-- Overview summary -->
  <div class="form-section">
    <h3>📊 สรุปภาพรวม</h3>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <?php foreach ([['ทั้งหมด',$total,'var(--primary)'],['เกินนัด',$overdueC,'var(--red)'],['วันนี้',$todayC,'#0d9488']] as [$l,$n,$c]): ?>
      <div style="text-align:center;padding:10px;background:var(--bg);border-radius:8px">
        <div style="font-size:22px;font-weight:700;color:<?= $c ?>"><?= $n ?></div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px"><?= $l ?></div>
      </div>
      <?php endforeach; ?>
    </div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <?php foreach ([['สีแดง',$redC,'var(--red)'],['สีเหลือง',$yellowC,'var(--yellow)'],['สีเขียว',$greenC,'var(--green)']] as [$l,$n,$c]): ?>
      <div style="flex:1;background:var(--bg);border-radius:8px;padding:8px;text-align:center">
        <div style="width:10px;height:10px;border-radius:50%;background:<?= $c ?>;margin:0 auto 4px"></div>
        <div style="font-size:16px;font-weight:700;color:<?= $c ?>"><?= $n ?></div>
        <div style="font-size:10px;color:var(--text3)"><?= $l ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- Add injection record -->
  <div class="form-section">
    <h3>💉 บันทึกนัดฉีดยา</h3>
    <form id="inject-form" onsubmit="saveRecord(event)">
      <div class="form-group">
        <label>ชื่อ-นามสกุล</label>
        <input list="name-list" name="name" id="inj-name" placeholder="พิมพ์หรือเลือกชื่อผู้ป่วย" required autocomplete="off">
        <datalist id="name-list">
          <?php foreach ($pNames as $p): ?><option value="<?= e($p['name']) ?>"><?php endforeach; ?>
        </datalist>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label>หมู่บ้าน</label>
          <select name="village" id="inj-village">
            <?php foreach (['หมู่ 1','หมู่ 2','หมู่ 3','หมู่ 4','หมู่ 5','หมู่ 6','หมู่ 7','หมู่ 8','หมู่ 9','นอกเขต'] as $v): ?>
            <option><?= $v ?></option>
            <?php endforeach; ?>
          </select>
        </div>
        <div class="form-group">
          <label>กลุ่มสี</label>
          <select name="group" id="inj-group">
            <option value="สีแดง">สีแดง</option>
            <option value="สีเหลือง" selected>สีเหลือง</option>
            <option value="สีเขียว">สีเขียว</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="form-group">
          <label>วันที่ฉีดยา</label>
          <input type="date" name="date" id="inj-date" required>
        </div>
        <div class="form-group">
          <label>รอบนัดต่อไป</label>
          <select name="interval" id="inj-interval">
            <option>2 สัปดาห์</option>
            <option>3 สัปดาห์</option>
            <option>4 สัปดาห์</option>
            <option selected>1 เดือน</option>
            <option>3 เดือน</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>หมายเหตุ (ถ้ามี)</label>
        <textarea name="note" id="inj-note" rows="3" placeholder="ชนิดยา อาการ หรือหมายเหตุ..." style="resize:vertical;min-height:70px;font-family:'Sarabun',sans-serif"></textarea>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          <?php foreach (['ฉีดยา Invega 100 mg','DEPO-A ฉีดทุก 3 เดือน','FLUPENTIXOL 40MG/2ML','อาการคงที่','ไม่มา','ส่งต่อ รพ.'] as $preset): ?>
          <button type="button" onclick="appendNote('<?= e($preset) ?>')"
            style="font-size:11px;padding:3px 9px;border-radius:20px;border:1px solid var(--border);background:var(--bg);color:var(--text2);cursor:pointer;font-family:'Sarabun',sans-serif;font-weight:600">
            + <?= $preset ?>
          </button>
          <?php endforeach; ?>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block" id="inj-btn">บันทึกนัดหมาย</button>
    </form>
  </div>

  <!-- Notification settings -->
  <div class="form-section">
    <h3>⚙️ ตั้งค่าการแจ้งเตือน</h3>
    <form method="POST" action="/jithome/api/settings.php" onsubmit="saveSettings(event)">
      <div class="settings-row">
        <div><div class="settings-label">ชื่อโรงพยาบาล</div></div>
        <input name="hospital_name" value="<?= e($settings['hospital_name']??'รพ.สต.สองคอน') ?>" style="border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-family:'Sarabun',sans-serif;font-size:13px;width:160px">
      </div>
      <div class="settings-row">
        <div><div class="settings-label">แจ้งเตือนล่วงหน้า (วัน)</div></div>
        <input type="number" name="alert_days" value="<?= e($settings['alert_days']??'1') ?>" min="1" max="14" style="border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-family:'Sarabun',sans-serif;font-size:13px;width:60px">
      </div>
      <div class="settings-row">
        <div><div class="settings-label">ส่งผ่าน Telegram Bot</div></div>
        <label class="toggle"><input type="checkbox" name="telegram_enabled" <?= ($settings['telegram_enabled']??'1')==='1'?'checked':'' ?>><span class="toggle-slider"></span></label>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">LINE Notify</div></div>
        <label class="toggle"><input type="checkbox" name="line_enabled" <?= ($settings['line_enabled']??'1')==='1'?'checked':'' ?>><span class="toggle-slider"></span></label>
      </div>
      <div style="margin-top:14px">
        <button type="submit" class="btn btn-primary" style="width:auto;padding:9px 20px" id="settings-btn">บันทึกการตั้งค่า</button>
      </div>
    </form>
  </div>

  <!-- Data connections -->
  <div class="form-section">
    <h3>🔗 เชื่อมต่อข้อมูล</h3>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px;margin-top:-4px">นำเข้า/ส่งออก และเชื่อมข้อมูลกับระบบภายนอก</div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px">
      <a href="/jithome/api/export.php?format=csv" style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;background:#ecfdf5;border:1.5px solid #a7f3d0;border-radius:10px;cursor:pointer;text-decoration:none">
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:18px">📥</span><span style="font-size:13px;font-weight:700;color:#059669">ส่งออกข้อมูล</span></div>
        <div style="font-size:10px;color:var(--text3)">CSV / JSON</div>
      </a>
      <button onclick="alert('เชื่อมต่อ Google Sheets')" style="display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 14px;background:var(--primary-lt);border:1.5px solid rgba(10,126,164,.25);border-radius:10px;cursor:pointer;text-align:left;font-family:'Sarabun',sans-serif">
        <div style="display:flex;align-items:center;gap:6px"><span style="font-size:18px">📤</span><span style="font-size:13px;font-weight:700;color:var(--primary)">นำเข้าไฟล์</span></div>
        <div style="font-size:10px;color:var(--text3)">Excel / CSV</div>
      </button>
    </div>

    <?php // Google Sheets ?>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0f9d58;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">G</div>
          <div><div style="font-size:13px;font-weight:700">Google Sheets</div><div style="font-size:11px;color:var(--text3)">ซิงค์อัตโนมัติ</div></div>
        </div>
        <span style="font-size:10px;background:var(--green-lt);color:var(--green);padding:2px 8px;border-radius:20px;font-weight:700">● Active</span>
      </div>
      <input type="text" value="<?= e($settings['sheets_url']??'') ?>" placeholder="https://docs.google.com/spreadsheets/d/..." style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace">
    </div>

    <?php // HOSxP ?>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0a7ea4;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:11px">H</div>
          <div><div style="font-size:13px;font-weight:700">HOSxP / JHCIS</div><div style="font-size:11px;color:var(--text3)">ระบบฐานข้อมูล รพ.สต.</div></div>
        </div>
        <label class="toggle"><input type="checkbox" <?= ($settings['hosxp_enabled']??'1')==='1'?'checked':'' ?> onchange="toggleSetting('hosxp_enabled',this.checked)"><span class="toggle-slider"></span></label>
      </div>
    </div>

    <?php // LINE OA ?>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#06c755;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">L</div>
          <div><div style="font-size:13px;font-weight:700">LINE Notify / OA</div><div style="font-size:11px;color:var(--text3)">แจ้งเตือนผ่าน LINE กลุ่ม อสม.</div></div>
        </div>
        <label class="toggle"><input type="checkbox" <?= ($settings['line_enabled']??'1')==='1'?'checked':'' ?> onchange="toggleSetting('line_enabled',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <input type="text" value="<?= e($settings['line_token']??'') ?>" placeholder="LINE Access Token" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace">
    </div>

    <?php // Telegram ?>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;margin-bottom:10px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0088cc;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px">T</div>
          <div><div style="font-size:13px;font-weight:700">Telegram Bot</div><div style="font-size:11px;color:var(--text3)"><?= e($settings['telegram_bot']??'@JitHomeBot') ?> · กลุ่มแจ้งเตือน</div></div>
        </div>
        <label class="toggle"><input type="checkbox" <?= ($settings['telegram_enabled']??'1')==='1'?'checked':'' ?> onchange="toggleSetting('telegram_enabled',this.checked)"><span class="toggle-slider"></span></label>
      </div>
      <input type="text" value="<?= e($settings['telegram_chatid']??'') ?>" placeholder="Chat ID เช่น -1001234567890" style="width:100%;padding:7px 10px;font-size:11px;border:1px solid var(--border);border-radius:6px;background:#fff;color:var(--text2);font-family:monospace">
    </div>

    <?php // Cloud Backup ?>
    <div style="background:var(--bg);border-radius:10px;padding:12px 14px;border:1px solid var(--border)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:8px">
          <div style="width:32px;height:32px;background:#0ea5e9;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px">☁️</div>
          <div><div style="font-size:13px;font-weight:700">Cloud Backup</div><div style="font-size:11px;color:var(--text3)">สำรองข้อมูลอัตโนมัติทุก 24 ชม.</div></div>
        </div>
        <label class="toggle"><input type="checkbox" <?= ($settings['cloud_backup']??'1')==='1'?'checked':'' ?> onchange="toggleSetting('cloud_backup',this.checked)"><span class="toggle-slider"></span></label>
      </div>
    </div>
  </div>

  <!-- อสม. list -->
  <div class="form-section">
    <h3>👥 อสม. ผู้ดูแล</h3>
    <?php foreach ([['หมู่ 1-3','นางสาวสมจิต พิมพ์สวย'],['หมู่ 4-6','นายสมศักดิ์ ใจดี'],['หมู่ 7-9','นางมาลี รักษ์ดี']] as [$area,$name]): ?>
    <div class="settings-row">
      <div><div class="settings-label"><?= $name ?></div><div class="settings-val">รับผิดชอบ <?= $area ?></div></div>
      <span style="font-size:11px;background:var(--green-lt);color:var(--green);padding:2px 8px;border-radius:20px;font-weight:700">เข้าสู่ระบบ</span>
    </div>
    <?php endforeach; ?>
  </div>
</div>

<script>
function appendNote(text) {
  const ta = document.getElementById('inj-note');
  ta.value = ta.value ? ta.value + ' · ' + text : text;
}

async function saveRecord(e) {
  e.preventDefault();
  const btn  = document.getElementById('inj-btn');
  const data = {
    name:     document.getElementById('inj-name').value,
    village:  document.getElementById('inj-village').value,
    group:    document.getElementById('inj-group').value,
    date:     document.getElementById('inj-date').value,
    interval: document.getElementById('inj-interval').value,
    note:     document.getElementById('inj-note').value,
  };
  btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
  try {
    const r = await fetch('/jithome/api/records.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
    const j = await r.json();
    if (j.success) {
      btn.textContent = '✅ บันทึกสำเร็จ';
      document.getElementById('inject-form').reset();
      setTimeout(()=>{ btn.textContent='บันทึกนัดหมาย'; btn.disabled=false; }, 2500);
    } else { throw new Error(j.error||'error'); }
  } catch(err) {
    btn.textContent = '❌ เกิดข้อผิดพลาด: ' + err.message;
    btn.disabled = false;
  }
}

async function saveSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('settings-btn');
  const fd  = new FormData(e.target);
  const obj = Object.fromEntries(fd.entries());
  obj.telegram_enabled = fd.has('telegram_enabled') ? '1' : '0';
  obj.line_enabled     = fd.has('line_enabled') ? '1' : '0';
  btn.disabled = true; btn.textContent = 'กำลังบันทึก...';
  try {
    const r = await fetch('/jithome/api/settings.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(obj)});
    const j = await r.json();
    btn.textContent = j.success ? '✅ บันทึกแล้ว' : '❌ ผิดพลาด';
    setTimeout(()=>{ btn.textContent='บันทึกการตั้งค่า'; btn.disabled=false; }, 2000);
  } catch(err) {
    btn.textContent = '❌ ผิดพลาด'; btn.disabled = false;
  }
}

async function toggleSetting(key, val) {
  await fetch('/jithome/api/settings.php', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({[key]: val?'1':'0'})});
}
</script>
