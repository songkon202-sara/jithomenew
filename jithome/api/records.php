<?php
// ─── API: Add Injection Record ─────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/functions.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'POST only']);
    exit;
}

$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

$name     = trim($body['name']     ?? '');
$village  = trim($body['village']  ?? 'หมู่ 1');
$group    = trim($body['group']    ?? 'สีเหลือง');
$date     = trim($body['date']     ?? '');
$interval = trim($body['interval'] ?? '1 เดือน');
$note     = trim($body['note']     ?? '');

if (!$name || !$date) {
    echo json_encode(['success' => false, 'error' => 'ชื่อและวันที่ต้องกรอก']);
    exit;
}

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    echo json_encode(['success' => false, 'error' => 'วันที่ไม่ถูกต้อง']);
    exit;
}

$groupColor = parseGroupColor($group);
$groupLabel = match($groupColor) {
    'red'    => 'สุขภาพจิต กลุ่ม สีแดง',
    'green'  => 'สุขภาพจิต กลุ่ม สีเขียว',
    default  => 'สุขภาพจิต กลุ่ม สีเหลือง',
};
$intervalDays = parseInterval($interval);

try {
    $db = getDB();

    // Upsert patient (PostgreSQL: ON CONFLICT DO NOTHING)
    $db->prepare(
        'INSERT INTO patients (name, village) VALUES (?, ?) ON CONFLICT (name) DO NOTHING'
    )->execute([$name, $village]);

    $st = $db->prepare('SELECT id FROM patients WHERE name = ?');
    $st->execute([$name]);
    $patientId = $st->fetchColumn();

    if (!$patientId) {
        echo json_encode(['success' => false, 'error' => 'ไม่สามารถสร้างผู้ป่วยได้']);
        exit;
    }

    // Update village if changed
    $db->prepare('UPDATE patients SET village = ? WHERE id = ?')->execute([$village, $patientId]);

    // Insert record — RETURNING id for PostgreSQL
    $ins = $db->prepare(
        'INSERT INTO injection_records
           (patient_id, injection_date, group_color, group_label, interval_str, interval_days, note)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         RETURNING id'
    );
    $ins->execute([$patientId, $date, $groupColor, $groupLabel, $interval, $intervalDays, $note]);
    $recordId = $ins->fetchColumn();

    echo json_encode([
        'success'    => true,
        'patient_id' => (int)$patientId,
        'record_id'  => (int)$recordId,
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
