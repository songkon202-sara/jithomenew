<?php
// header.php — outputs <html> ... <body> ... sidebar + app-header
// Expects: $page (string), $hospitalName (string), $overdueCount, $todayCount
$overdueCount = $overdueCount ?? 0;
$todayCount   = $todayCount   ?? 0;
$hospitalName = $hospitalName ?? getSetting('hospital_name', 'รพ.สต.สองคอน');
$notifCount   = $overdueCount + $todayCount;

$navItems = [
    ['id' => 'dashboard', 'label' => 'หน้าหลัก',  'icon' => 'home'],
    ['id' => 'patients',  'label' => 'ผู้ป่วย',    'icon' => 'users'],
    ['id' => 'timeline',  'label' => 'ตารางนัด',   'icon' => 'calendar'],
    ['id' => 'overview',  'label' => 'ภาพรวม',     'icon' => 'chart'],
    ['id' => 'visit',     'label' => 'เยี่ยมบ้าน', 'icon' => 'house'],
    ['id' => 'admin',     'label' => 'แอดมิน',     'icon' => 'settings'],
];

function navIcon(string $icon): string {
    return match($icon) {
        'home'     => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        'users'    => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
        'calendar' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
        'chart'    => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></svg>',
        'house'    => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
        'settings' => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
        default    => '',
    };
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<title>JitHome — ระบบติดตามผู้ป่วยจิตเวช</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<div id="root">

  <!-- ═══ DESKTOP SIDEBAR ════════════════════════════════════ -->
  <div class="sidebar">
    <div class="sidebar-logo">
      <div style="font-size:18px;font-weight:800;color:var(--primary)">JitHome</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px"><?= e($hospitalName) ?></div>
    </div>
    <nav class="sidebar-nav">
      <?php foreach ($navItems as $n): ?>
      <a href="?page=<?= $n['id'] ?>" class="sidebar-nav-item <?= $page === $n['id'] ? 'active' : '' ?>">
        <span style="width:18px;height:18px;display:inline-flex;flex-shrink:0"><?= navIcon($n['icon']) ?></span>
        <?= $n['label'] ?>
        <?php if ($n['id'] === 'dashboard' && $overdueCount > 0): ?>
        <span style="margin-left:auto;background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:1px 6px;border-radius:20px"><?= $overdueCount ?></span>
        <?php endif; ?>
      </a>
      <?php endforeach; ?>
    </nav>

    <!-- Quick shortcuts -->
    <div style="padding:8px 12px;display:flex;flex-direction:column;gap:8px">
      <a href="?page=visit" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(135deg,#ecfeff,#f0f9ff);border:1.5px solid rgba(10,126,164,.25);border-radius:10px;cursor:pointer;text-decoration:none">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0">🏥</div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text)">เยี่ยมบ้านวันนี้</div>
          <div style="font-size:10px;color:var(--text3)">เริ่มบันทึกเยี่ยม →</div>
        </div>
      </a>
      <a href="?page=overview" style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:1.5px solid var(--green-bd);border-radius:10px;cursor:pointer;text-decoration:none">
        <div style="width:32px;height:32px;border-radius:8px;background:var(--green);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;flex-shrink:0">📊</div>
        <div>
          <div style="font-size:12px;font-weight:700;color:var(--text)">รายงานสรุป</div>
          <div style="font-size:10px;color:var(--text3)">ดูภาพรวม รพ.สต.</div>
        </div>
      </a>
    </div>

    <!-- Overdue flag card -->
    <?php if ($overdueCount > 0): ?>
    <div style="margin:4px 12px 12px;position:relative;background:linear-gradient(135deg,#fef2f2,#fff7f7);border:1px solid var(--red-bd);border-radius:10px;padding:10px 12px 10px 28px;overflow:visible">
      <svg style="position:absolute;left:-6px;top:8px;width:22px;height:28px" viewBox="0 0 22 28" fill="none">
        <line x1="4" y1="2" x2="4" y2="28" stroke="#dc2626" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M4 3 L20 8 L4 14 Z" fill="#dc2626" stroke="#991b1b" stroke-width="0.8" stroke-linejoin="round"/>
      </svg>
      <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:2px">ต้องติดตาม</div>
      <div style="font-size:10px;color:var(--text2);line-height:1.4">มีผู้ป่วยเกินวันนัด <?= $overdueCount ?> ราย</div>
      <a href="?page=timeline" style="display:inline-block;margin-top:6px;background:var(--red);color:#fff;border-radius:6px;padding:4px 10px;font-size:10px;font-weight:700;text-decoration:none">ดูรายการ →</a>
    </div>
    <?php endif; ?>

    <!-- User info -->
    <div style="padding:12px;border-top:1px solid var(--border)">
      <div style="display:flex;align-items:center;gap:8px;padding:10px;border-radius:8px;background:var(--bg)">
        <div style="width:30px;height:30px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;font-weight:700">อ</div>
        <div>
          <div style="font-size:12px;font-weight:600">อสม. ผู้ดูแล</div>
          <div style="font-size:10px;color:var(--text3)">สองคอน</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ═══ MAIN CONTENT AREA ══════════════════════════════════ -->
  <div class="app-main">

    <!-- App Header -->
    <div class="app-header">
      <div>
        <div class="header-title">JitHome</div>
        <div class="header-sub"><?= e($hospitalName) ?> · ระบบติดตามจิตเวช</div>
      </div>
      <div class="header-right">
        <a href="?page=timeline" class="notif-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          <?php if ($notifCount > 0): ?><span class="notif-badge"><?= $notifCount ?></span><?php endif; ?>
        </a>
        <div class="avatar">อ</div>
      </div>
    </div>

    <!-- Page Content injected here -->
