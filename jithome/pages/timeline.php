<?php
// ─── Timeline Page ─────────────────────────────────────────────
$patients = getAllPatients($db);
usort($patients, fn($a, $b) => strcmp($a['next_date'] ?? '', $b['next_date'] ?? ''));

// Group by date
$groups   = [];
foreach ($patients as $p) {
    $key = $p['next_date'] ?? 'unknown';
    $groups[$key][] = $p;
}

$todayKey = date('Y-m-d');
?>

<div class="page">
  <div class="page-title">ตารางนัดหมาย</div>
  <div class="page-sub">เรียงตามวันนัดฉีดยา</div>

  <?php foreach ($groups as $dateStr => $pts): ?>
  <?php
    $isToday = $dateStr === $todayKey;
    $isPast  = $dateStr < $todayKey;
    $color   = $isPast ? 'var(--red)' : ($isToday ? 'var(--primary)' : 'var(--text3)');
    $prefix  = $isPast ? '⚠️ ' : ($isToday ? '📅 ' : '');
    $suffix  = $isToday ? ' — วันนี้' : '';
    $bg      = $isPast ? 'var(--red-lt)' : ($isToday ? 'var(--primary-lt)' : 'var(--bg)');
  ?>
  <div class="tl-date-hd <?= $isToday ? 'today-hd' : '' ?>" style="color:<?= $color ?>">
    <?= $prefix . thDateFull($dateStr) . $suffix ?>
    <span style="margin-left:6px;background:<?= $bg ?>;color:<?= $color ?>;padding:1px 8px;border-radius:20px;font-size:11px"><?= count($pts) ?> ราย</span>
  </div>
  <?php foreach ($pts as $p): echo patientCard($p); endforeach; ?>
  <?php endforeach; ?>
</div>
