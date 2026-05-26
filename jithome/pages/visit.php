<?php
// ─── Home Visit Page ───────────────────────────────────────────
$db = getDB();

// Fetch visits
$visitRows = $db->query(
    'SELECT * FROM home_visits ORDER BY visit_date DESC, id DESC'
)->fetchAll();

$patients     = getPatientNames($db);
$staffCount   = count(array_filter($visitRows, fn($v) => $v['visit_type'] === 'staff'));
$aosomoCount  = count(array_filter($visitRows, fn($v) => $v['visit_type'] === 'aosomo'));
$referCount   = count(array_filter($visitRows, fn($v) => $v['refer']));

$staffChecklist = [
    ['s1','ประเมินสุขภาพจิต (MINI / HoNOS)'],
    ['s2','ตรวจวัดสัญญาณชีพ (BP, PR, T)'],
    ['s3','ประเมินการรับประทานยา / ฉีดยา'],
    ['s4','ประเมินความเสี่ยงต่อการทำร้ายตนเอง/ผู้อื่น'],
    ['s5','ประเมินสิ่งแวดล้อม / ความปลอดภัยในบ้าน'],
    ['s6','ให้คำปรึกษาครอบครัว'],
    ['s7','ประเมิน ADL (กิจวัตรประจำวัน)'],
    ['s8','นัดหมายครั้งต่อไป / ส่งต่อ'],
];
$aosomoChecklist = [
    ['a1','ผู้ป่วยอยู่บ้าน พบตัวได้'],
    ['a2','ผู้ป่วยกินยาสม่ำเสมอ'],
    ['a3','อาการสงบ ไม่กระสับกระส่าย'],
    ['a4','มีผู้ดูแลในบ้าน'],
    ['a5','ไม่มีพฤติกรรมก้าวร้าว / เสี่ยง'],
    ['a6','บ้านสะอาด สภาพแวดล้อมปลอดภัย'],
    ['a7','ผู้ป่วยรู้จักวันนัดครั้งต่อไป'],
];

function scoreColor(int $score, int $max): array {
    $pct = $max > 0 ? $score/$max : 0;
    if ($pct >= 0.8) return ['bg'=>'var(--green-lt)', 'color'=>'var(--green)', 'label'=>'ปกติดี'];
    if ($pct >= 0.5) return ['bg'=>'var(--yellow-lt)','color'=>'var(--yellow)','label'=>'พอใช้'];
    return ['bg'=>'var(--red-lt)','color'=>'var(--red)','label'=>'ต้องติดตาม'];
}

// Encode checklists for JS
$staffChecklistJson  = json_encode($staffChecklist,  JSON_UNESCAPED_UNICODE);
$aosomoChecklistJson = json_encode($aosomoChecklist, JSON_UNESCAPED_UNICODE);
$patientNamesJson    = json_encode(array_map(fn($p) => ['id'=>$p['id'],'name'=>$p['name'],'village'=>$p['village']], $patients), JSON_UNESCAPED_UNICODE);
?>

<div class="page">
  <div class="page-title">เยี่ยมบ้าน</div>
  <div class="page-sub">บันทึกและติดตามการเยี่ยมผู้ป่วยจิตเวช</div>

  <!-- Summary cards -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">
    <?php foreach ([
      ['ทั้งหมด',count($visitRows),'var(--primary)','var(--primary-lt)','📋'],
      ['เจ้าหน้าที่',$staffCount,'#0d9488','#ccfbf1','🏥'],
      ['อสม.',$aosomoCount,'#7c3aed','#ede9fe','🏡'],
    ] as [$l,$n,$c,$bg,$ico]): ?>
    <div style="background:<?= $bg ?>;border-radius:10px;padding:10px 12px;text-align:center">
      <div style="font-size:18px"><?= $ico ?></div>
      <div style="font-size:20px;font-weight:800;color:<?= $c ?>;margin-top:2px"><?= $n ?></div>
      <div style="font-size:11px;color:<?= $c ?>;font-weight:600;opacity:.8"><?= $l ?></div>
    </div>
    <?php endforeach; ?>
  </div>

  <?php if ($referCount > 0): ?>
  <div style="background:var(--red-lt);border:1px solid var(--red-bd);border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
    <span style="font-size:20px">⚠️</span>
    <div>
      <div style="font-size:13px;font-weight:700;color:var(--red)">มี <?= $referCount ?> ราย ที่ต้องส่งต่อ/รายงานเร่งด่วน</div>
      <div style="font-size:11px;color:var(--text3)">กรุณาตรวจสอบและดำเนินการ</div>
    </div>
  </div>
  <?php endif; ?>

  <!-- Action buttons -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
    <button class="btn btn-primary" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px" onclick="openVisitForm('staff')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1" ry="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>
      เจ้าหน้าที่เยี่ยม
    </button>
    <button style="display:flex;align-items:center;justify-content:center;gap:8px;padding:12px;border:2px solid #7c3aed;background:#faf5ff;color:#7c3aed;border-radius:var(--radius-sm);font-family:'Sarabun',sans-serif;font-size:14px;font-weight:700;cursor:pointer" onclick="openVisitForm('aosomo')">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      อสม. เยี่ยม
    </button>
  </div>

  <!-- Tab filter -->
  <div class="tab-bar">
    <?php foreach ([['all','ทั้งหมด'],['staff','🏥 เจ้าหน้าที่'],['aosomo','🏡 อสม.'],['refer','⚠️ ส่งต่อ']] as [$v,$l]): ?>
    <button class="tab-btn <?= $v==='all'?'active':'' ?>" data-tab="<?= $v ?>" onclick="setVisitTab('<?= $v ?>')"><?= $l ?></button>
    <?php endforeach; ?>
  </div>

  <!-- Visit list -->
  <div id="visit-list">
    <?php if (empty($visitRows)): ?>
    <div class="empty" id="visit-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48" style="margin:0 auto 12px;display:block;opacity:.4"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
      <p>ยังไม่มีรายการเยี่ยมบ้าน</p>
    </div>
    <?php else: foreach ($visitRows as $v): ?>
    <?php
      $cl = $v['visit_type']==='staff' ? $staffChecklist : $aosomoChecklist;
      $checks = json_decode($v['checks_json']??'[]', true) ?: [];
      $score = (int)$v['score'];
      $sc = scoreColor($score, count($cl));
      $typeLabel = $v['visit_type']==='staff' ? '🏥 เจ้าหน้าที่' : '🏡 อสม.';
      $typeBg = $v['visit_type']==='staff' ? '#ccfbf1' : '#ede9fe';
      $typeClr = $v['visit_type']==='staff' ? '#0d9488' : '#7c3aed';
    ?>
    <div class="visit-card <?= $v['visit_type']==='aosomo'?'aosomo':'' ?>" data-type="<?= $v['visit_type'] ?>" data-refer="<?= $v['refer']?1:0 ?>">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
        <div>
          <div style="font-size:15px;font-weight:700"><?= e($v['patient_name']) ?></div>
          <div style="font-size:12px;color:var(--text3);margin-top:1px"><?= e($v['village']) ?> · <?= thDate($v['visit_date']) ?></div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          <span style="font-size:11px;background:<?= $typeBg ?>;color:<?= $typeClr ?>;padding:2px 8px;border-radius:20px;font-weight:700"><?= $typeLabel ?></span>
          <?php if ($v['refer']): ?><span style="font-size:11px;background:var(--red-lt);color:var(--red);padding:2px 8px;border-radius:20px;font-weight:700">⚠️ ส่งต่อ</span><?php endif; ?>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:<?= $v['note']?8:0 ?>px">
        <span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:<?= $sc['bg'] ?>;color:<?= $sc['color'] ?>">ผล <?= $score ?>/<?= count($cl) ?> · <?= $sc['label'] ?></span>
        <span style="font-size:12px;color:var(--text3)">โดย <?= e($v['visitor']) ?></span>
      </div>
      <?php if ($v['note']): ?><div style="font-size:12px;color:var(--text2);padding-top:8px;border-top:1px solid var(--border);margin-top:4px"><?= e($v['note']) ?></div><?php endif; ?>
      <div style="height:4px;background:var(--border);border-radius:2px;margin-top:8px;overflow:hidden">
        <div style="width:<?= count($cl) > 0 ? round($score/count($cl)*100) : 0 ?>%;height:100%;background:<?= $sc['color'] ?>;border-radius:2px"></div>
      </div>
    </div>
    <?php endforeach; endif; ?>
  </div>
</div>

<script>
const STAFF_CHECKLIST  = <?= $staffChecklistJson ?>;
const AOSOMO_CHECKLIST = <?= $aosomoChecklistJson ?>;
const PATIENT_NAMES    = <?= $patientNamesJson ?>;

function setVisitTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('#visit-list .visit-card').forEach(card => {
    if (tab === 'all')   card.style.display = '';
    else if (tab === 'refer') card.style.display = card.dataset.refer === '1' ? '' : 'none';
    else card.style.display = card.dataset.type === tab ? '' : 'none';
  });
}
</script>
