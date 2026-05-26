<?php
// ─── Patients Page ─────────────────────────────────────────────
$patients = getAllPatients($db);
$villages = array_unique(array_filter(array_column($patients, 'village')));
sort($villages);
?>

<div class="page">
  <div class="page-title">ผู้ป่วยทั้งหมด</div>
  <div class="page-sub" id="pt-count"><?= count($patients) ?> รายการ จากทั้งหมด <?= count($patients) ?> ราย</div>

  <!-- Search -->
  <div class="search-wrap">
    <span class="search-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    </span>
    <input id="pt-search" placeholder="ค้นหาชื่อ หรือ หมู่บ้าน..." oninput="filterPatients()" autocomplete="off">
  </div>

  <!-- Group filter -->
  <div class="filter-row" id="group-filter">
    <?php foreach (['all' => 'ทั้งหมด', 'red' => '🔴 สีแดง', 'yellow' => '🟡 สีเหลือง', 'green' => '🟢 สีเขียว'] as $v => $l): ?>
    <button class="filter-chip <?= $v !== 'all' ? $v : '' ?> <?= $v === 'all' ? 'active' : '' ?>"
            data-group="<?= $v ?>" onclick="setGroupFilter('<?= $v ?>')"><?= $l ?></button>
    <?php endforeach; ?>
  </div>

  <!-- Village filter -->
  <div class="filter-row" style="margin-top:-6px" id="village-filter">
    <button class="filter-chip active" data-village="all" onclick="setVillageFilter('all')">ทุกหมู่บ้าน</button>
    <?php foreach ($villages as $v): ?>
    <button class="filter-chip" data-village="<?= e($v) ?>" onclick="setVillageFilter('<?= e($v) ?>')"><?= e($v) ?></button>
    <?php endforeach; ?>
  </div>

  <!-- Patient list -->
  <div id="patient-list">
    <?php foreach ($patients as $p): echo patientCard($p); endforeach; ?>
  </div>

  <div id="empty-state" class="empty" style="display:none">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
    <p>ไม่พบรายการ</p>
  </div>
</div>

<script>
let _groupF   = 'all';
let _villageF = 'all';

function filterPatients() {
  const q       = document.getElementById('pt-search').value.toLowerCase();
  const cards   = document.querySelectorAll('#patient-list .patient-card');
  let   visible = 0;

  cards.forEach(card => {
    const group   = card.dataset.group;
    const village = card.dataset.village;
    const name    = card.querySelector('.pc-name').textContent.toLowerCase();
    const vill    = village.toLowerCase();

    const matchQ = !q || name.includes(q) || vill.includes(q);
    const matchG = _groupF === 'all' || group === _groupF;
    const matchV = _villageF === 'all' || village === _villageF;

    const show = matchQ && matchG && matchV;
    card.style.display = show ? '' : 'none';
    if (show) visible++;
  });

  document.getElementById('pt-count').textContent =
    visible + ' รายการ จากทั้งหมด ' + cards.length + ' ราย';
  document.getElementById('empty-state').style.display = visible === 0 ? '' : 'none';
}

function setGroupFilter(val) {
  _groupF = val;
  document.querySelectorAll('#group-filter .filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.group === val);
  });
  filterPatients();
}

function setVillageFilter(val) {
  _villageF = val;
  document.querySelectorAll('#village-filter .filter-chip').forEach(b => {
    b.classList.toggle('active', b.dataset.village === val);
  });
  filterPatients();
}
</script>
