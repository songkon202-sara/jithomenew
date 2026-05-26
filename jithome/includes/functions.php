<?php
// ─── Shared Helper Functions ───────────────────────────────────

function thDate(?string $date): string {
    if (!$date) return '';
    $d = new DateTime($date . ' 00:00:00', new DateTimeZone('UTC'));
    $months = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
    return $d->format('j') . ' ' . $months[(int)$d->format('n')] . ' ' . ((int)$d->format('Y') + 543);
}

function thDateFull(?string $date): string {
    if (!$date) return '';
    $d = new DateTime($date . ' 00:00:00', new DateTimeZone('UTC'));
    $months = ['','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
               'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
    return $d->format('j') . ' ' . $months[(int)$d->format('n')] . ' ' . ((int)$d->format('Y') + 543);
}

function thDayFull(?string $date): string {
    if (!$date) return '';
    $d = new DateTime($date . ' 00:00:00', new DateTimeZone('UTC'));
    $days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
    return 'วัน' . $days[(int)$d->format('w')] . 'ที่ ' . thDateFull($date);
}

function daysChip(int $days): array {
    if ($days < 0) return ['cls' => 'overdue',  'label' => 'เกินนัด ' . abs($days) . ' วัน'];
    if ($days === 0) return ['cls' => 'today',   'label' => 'วันนี้'];
    if ($days <= 3)  return ['cls' => 'soon',    'label' => 'อีก ' . $days . ' วัน'];
    return ['cls' => 'upcoming', 'label' => 'อีก ' . $days . ' วัน'];
}

function groupLabel(string $group): string {
    return match($group) {
        'red'    => 'กลุ่มสีแดง',
        'yellow' => 'กลุ่มสีเหลือง',
        'green'  => 'กลุ่มสีเขียว',
        default  => 'กลุ่มสีเหลือง',
    };
}

function groupEmoji(string $group): string {
    return match($group) {
        'red'    => '🔴',
        'yellow' => '🟡',
        'green'  => '🟢',
        default  => '🟡',
    };
}

function parseInterval(?string $s): int {
    if (!$s) return 30;
    if (preg_match('/3\s*เดือน/', $s))    return 90;
    if (preg_match('/1\s*เดือน/', $s))    return 30;
    if (preg_match('/4\s*สัปดาห์?/', $s)) return 28;
    if (preg_match('/3\s*สัปดาห์?/', $s)) return 21;
    if (preg_match('/2\s*สัปดาห์?/', $s)) return 14;
    return 30;
}

function parseGroupColor(?string $g): string {
    if (!$g) return 'yellow';
    if (str_contains($g, 'สีแดง') || $g === 'red')    return 'red';
    if (str_contains($g, 'สีเขียว') || $g === 'green') return 'green';
    return 'yellow';
}

// Render a patient card HTML
function patientCard(array $p, bool $showNote = true): string {
    $chip  = daysChip((int)$p['days_until']);
    $over  = (int)$p['days_until'] < 0;
    $group = $p['group_color'];
    $cls   = 'patient-card ' . $group . ($over ? ' overdue' : '') . ' fade-up';
    $note  = $showNote && !empty($p['note']) ? '<div class="pc-note">' . e($p['note']) . '</div>' : '';

    // Encode patient data for JS
    $data = htmlspecialchars(json_encode([
        'id'          => $p['id'],
        'name'        => $p['name'],
        'village'     => $p['village'],
        'group_color' => $group,
        'group_label' => $p['group_label'] ?? groupLabel($group),
        'interval_str'=> $p['interval_str'] ?? '',
        'next_date'   => $p['next_date'] ?? '',
        'days_until'  => (int)$p['days_until'],
        'note'        => $p['note'] ?? '',
    ], JSON_UNESCAPED_UNICODE), ENT_QUOTES);

    return <<<HTML
<div class="{$cls}" onclick="openModal({$p['id']})" data-id="{$p['id']}" data-group="{$group}" data-village="{$p['village']}" data-patient='{$data}'>
  <div class="pc-top">
    <div>
      <div class="pc-name">{$p['name']}</div>
      <div class="pc-village">{$p['village']}</div>
    </div>
    <span class="days-chip {$chip['cls']}">{$chip['label']}</span>
  </div>
  <div class="pc-meta">
    <span class="badge {$group}"><span class="badge-dot"></span>{$p['group_label']}</span>
    <span class="pc-date">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2l4 4-1 1-4-4z"/><path d="M15.5 4.5l4 4"/><path d="M14 6l-9 9 1 4 4 1 9-9z"/><path d="M5 19l-3 3"/></svg>
      นัด {$p['next_th']}
    </span>
  </div>
  {$note}
</div>
HTML;
}

// HTML-escape shorthand
function e(string $s): string {
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

// Fetch all patient statuses from DB
function getAllPatients(PDO $db): array {
    $rows = $db->query(
        'SELECT ps.*, p.name as pname FROM patient_status ps
         JOIN patients p ON p.id = ps.id
         ORDER BY days_until ASC'
    )->fetchAll();

    return array_map(function($r) {
        $r['group_label'] = groupLabel($r['group_color']);
        $r['next_th']     = thDate($r['next_date'] ?? '');
        $r['last_th']     = thDate($r['last_date'] ?? '');
        return $r;
    }, $rows);
}

// Fetch patient names for datalist
function getPatientNames(PDO $db): array {
    return $db->query('SELECT id, name, village FROM patients ORDER BY name')->fetchAll();
}
