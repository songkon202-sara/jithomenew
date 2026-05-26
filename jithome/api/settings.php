<?php
// ─── API: Settings ─────────────────────────────────────────────
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['error' => 'POST only']); exit;
}

$body = json_decode(file_get_contents('php://input'), true) ?: [];

$allowed = ['hospital_name','alert_days','telegram_enabled','telegram_bot','telegram_chatid',
            'line_enabled','line_token','sheets_url','cloud_backup','hosxp_enabled'];

try {
    $db = getDB();
    // PostgreSQL: ON CONFLICT ... DO UPDATE (upsert)
    $st = $db->prepare(
        'INSERT INTO app_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value'
    );
    foreach ($body as $k => $v) {
        if (in_array($k, $allowed)) $st->execute([$k, $v]);
    }
    echo json_encode(['success' => true]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
