<?php
// ─── API: Home Visits ──────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/functions.php';

$db = getDB();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // List visits
    $type = $_GET['type'] ?? 'all';
    $sql  = 'SELECT * FROM home_visits';
    $args = [];
    if ($type !== 'all') { $sql .= ' WHERE visit_type = ?'; $args[] = $type; }
    $sql .= ' ORDER BY visit_date DESC, id DESC';
    $st = $db->prepare($sql);
    $st->execute($args);
    $rows = $st->fetchAll();
    foreach ($rows as &$r) {
        $r['visit_date_th'] = thDate($r['visit_date']);
        $r['checks']        = json_decode($r['checks_json'] ?? '[]', true) ?: [];
    }
    echo json_encode($rows, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);

    $patientName = trim($body['patient_name'] ?? '');
    $village     = trim($body['village']      ?? '');
    $visitType   = in_array($body['visit_type']??'', ['staff','aosomo']) ? $body['visit_type'] : 'aosomo';
    $visitDate   = trim($body['visit_date']   ?? date('Y-m-d'));
    $visitor     = trim($body['visitor']      ?? '');
    $checks      = (array)($body['checks']    ?? []);
    $score       = (int)($body['score']       ?? count($checks));
    $note        = trim($body['note']         ?? '');
    $refer       = !empty($body['refer']) ? 1 : 0;
    $nextAppt    = !empty($body['next_appt']) ? $body['next_appt'] : null;

    if (!$patientName || !$visitDate) {
        echo json_encode(['success'=>false,'error'=>'ชื่อและวันที่ต้องกรอก']);
        exit;
    }

    // Find patient_id
    $st = $db->prepare('SELECT id FROM patients WHERE name = ?');
    $st->execute([$patientName]);
    $patientId = $st->fetchColumn() ?: null;

    $ins = $db->prepare(
        'INSERT INTO home_visits
           (patient_id, patient_name, village, visit_type, visit_date, visitor,
            checks_json, score, note, refer, next_appt)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)'
    );
    $ins->execute([
        $patientId, $patientName, $village, $visitType, $visitDate, $visitor,
        json_encode($checks, JSON_UNESCAPED_UNICODE), $score, $note, $refer, $nextAppt
    ]);

    echo json_encode(['success'=>true,'id'=>(int)$db->lastInsertId()]);
    exit;
}

echo json_encode(['error'=>'Method not allowed']);
