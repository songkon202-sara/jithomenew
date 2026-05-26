<?php
// ─── Dashboard Page ────────────────────────────────────────────
$patients = getAllPatients($db);

$overdue  = array_filter($patients, fn($p) => (int)$p['days_until'] < 0);
$today    = array_filter($patients, fn($p) => (int)$p['days_until'] === 0);
$soon7    = array_filter($patients, fn($p) => (int)$p['days_until'] > 0 && (int)$p['days_until'] <= 7);
$week     = array_filter($patients, fn($p) => (int)$p['days_until'] >= 0 && (int)$p['days_until'] <= 7);

$redCount    = count(array_filter($patients, fn($p) => $p['group_color'] === 'red'));
$yellowCount = count(array_filter($patients, fn($p) => $p['group_color'] === 'yellow'));
$greenCount  = count(array_filter($patients, fn($p) => $p['group_color'] === 'green'));

$total = count($patients);

$todayDate    = date('Y-m-d');
$todayLabel   = thDayFull($todayDate);

$overdueCount = count($overdue);
$todayCount   = count($today);
?>

<div class="page">
  <!-- Today strip -->
  <div class="today-strip">
    <div style="font-size:11px;opacity:.75;margin-bottom:4px;font-weight:600;letter-spacing:.5px"><?= e($hospitalName) ?> · JitHome</div>
    <h2><?= $todayLabel ?></h2>
    <p>ระบบติดตามผู้ป่วยจิตเวช อสม.</p>
    <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
      <a href="?page=patients" class="pill-btn pill-all">
        👥 ผู้ป่วยทั้งหมด <span class="pill-count"><?= $total ?></span> ราย
      </a>
      <?php if ($overdueCount > 0): ?>
      <a href="?page=timeline" class="pill-btn pill-overdue">
        ⚠️ เกินนัด <span style="background:#ef4444;border-radius:20px;padding:1px 8px;font-weight:800;font-size:13px"><?= $overdueCount ?></span> ราย
      </a>
      <?php endif; ?>
      <?php if ($todayCount > 0): ?>
      <a href="?page=timeline" class="pill-btn pill-today">
        📅 วันนี้ <span class="pill-count-w"><?= $todayCount ?></span> ราย
      </a>
      <?php endif; ?>
      <a href="?page=timeline" class="pill-btn pill-week">
        🗓️ สัปดาห์นี้ <span class="pill-count-g"><?= count($week) ?></span> ราย
      </a>
    </div>
  </div>

  <!-- Stats grid -->
  <div class="stats-grid">
    <a href="?page=timeline" class="stat-card" style="background:var(--red-lt);border:1.5px solid var(--red-bd);text-decoration:none">
      <div class="stat-icon" style="background:var(--red-bd)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="stat-num" style="color:var(--red)"><?= $overdueCount ?></div>
      <div class="stat-label">เกินวันนัด</div>
    </a>
    <a href="?page=timeline" class="stat-card" style="background:#fffbeb;border:1.5px solid #fde68a;text-decoration:none">
      <div class="stat-icon" style="background:#fde68a">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="stat-num" style="color:var(--yellow)"><?= count(array_filter($patients, fn($p) => (int)$p['days_until'] >= 0 && (int)$p['days_until'] <= 3)) ?></div>
      <div class="stat-label">นัดภายใน 3 วัน</div>
    </a>
    <div class="stat-card" style="border:1.5px solid var(--red-bd)">
      <div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--red);display:inline-block"></span><span style="font-size:13px;font-weight:600;color:var(--red)">สีแดง</span></div>
      <div class="stat-num" style="color:var(--red)"><?= $redCount ?></div>
      <div class="stat-label">ผู้ป่วยกลุ่มวิกฤต</div>
    </div>
    <div class="stat-card" style="border:1.5px solid var(--yellow-bd)">
      <div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--yellow);display:inline-block"></span><span style="font-size:13px;font-weight:600;color:var(--yellow)">สีเหลือง</span></div>
      <div class="stat-num" style="color:var(--yellow)"><?= $yellowCount ?></div>
      <div class="stat-label">ผู้ป่วยเฝ้าระวัง</div>
    </div>
    <div class="stat-card wide" style="border:1.5px solid var(--green-bd)">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="display:flex;align-items:center;gap:6px"><span style="width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block"></span><span style="font-size:13px;font-weight:600;color:var(--green)">สีเขียว</span></div>
        <div class="stat-num" style="color:var(--green)"><?= $greenCount ?> <span style="font-size:14px">ราย</span></div>
      </div>
      <div class="stat-label">ผู้ป่วยอาการคงที่</div>
    </div>
  </div>

  <!-- Overdue -->
  <?php if ($overdueCount > 0): ?>
  <div class="section-hd"><h3 style="color:var(--red)">⚠️ เกินวันนัด</h3><a href="?page=timeline" class="see-all">ดูทั้งหมด</a></div>
  <?php foreach (array_slice($overdue, 0, 3) as $p): echo patientCard($p); endforeach; ?>
  <?php endif; ?>

  <!-- Today -->
  <?php if ($todayCount > 0): ?>
  <div class="section-hd"><h3 style="color:var(--primary)">📅 วันนี้</h3></div>
  <?php foreach ($today as $p): echo patientCard($p); endforeach; ?>
  <?php endif; ?>

  <!-- Upcoming 7 days -->
  <?php if (count($soon7) > 0): ?>
  <div class="section-hd"><h3>นัดใน 7 วัน</h3><span style="font-size:12px;color:var(--text3)"><?= count($soon7) ?> ราย</span></div>
  <?php foreach (array_slice($soon7, 0, 5) as $p): echo patientCard($p); endforeach; ?>
  <?php endif; ?>
</div>
