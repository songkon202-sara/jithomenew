<?php
// ─── API: Patient Detail + History ────────────────────────────
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../includes/functions.php';

$id     = (int)($_GET['id'] ?? 0);
$action = $_GET['action'] ?? 'detail';

if (!$id) {
    echo json_encode(['error' => 'Missing id']);
    exit;
}

try {
    $db = getDB();

    if ($action === 'detail') {
        // Latest status
        $st = $db->prepare('SELECT * FROM patient_status WHERE id = ?');
        $st->execute([$id]);
        $p = $st->fetch();

        if (!$p) {
            echo json_encode(['error' => 'Patient not found']);
            exit;
        }
        $p['group_label'] = groupLabel($p['group_color']);
        $p['next_th']     = thDateFull($p['next_date'] ?? '');
        $p['last_th']     = thDate($p['last_date'] ?? '');

        // History (all records)
        $st2 = $db->prepare(
            'SELECT id, injection_date, group_color, group_label, interval_str, note
             FROM injection_records
             WHERE patient_id = ?
             ORDER BY injection_date DESC, id DESC'
        );
        $st2->execute([$id]);
        $history = $st2->fetchAll();

        foreach ($history as &$h) {
            $h['date_th'] = thDate($h['injection_date']);
        }

        $p['history'] = $history;
        echo json_encode($p, JSON_UNESCAPED_UNICODE);

    } else {
        echo json_encode(['error' => 'Unknown action']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
