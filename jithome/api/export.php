<?php
// ─── API: Export Data ──────────────────────────────────────────
require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/functions.php';

$format = $_GET['format'] ?? 'csv';
$db     = getDB();

$rows = $db->query(
    'SELECT ps.name, ps.village, ps.group_color, ps.group_label, ps.interval_str,
            ps.last_date, ps.next_date, ps.days_until, ps.note
     FROM patient_status ps ORDER BY days_until ASC'
)->fetchAll();

if ($format === 'json') {
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="jithome_patients.json"');
    echo json_encode($rows, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// CSV
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="jithome_patients.csv"');
echo "\xEF\xBB\xBF"; // UTF-8 BOM for Excel

$out = fopen('php://output', 'w');
fputcsv($out, ['ชื่อ','หมู่บ้าน','กลุ่มสี','รอบนัด','วันที่ฉีดล่าสุด','วันนัดครั้งต่อไป','วันคงเหลือ','หมายเหตุ']);
foreach ($rows as $r) {
    fputcsv($out, [
        $r['name'], $r['village'], $r['group_label'], $r['interval_str'],
        thDate($r['last_date']), thDate($r['next_date']), $r['days_until'], $r['note']
    ]);
}
fclose($out);
