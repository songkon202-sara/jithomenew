<?php
// ─── JitHome — Main Router ─────────────────────────────────────
declare(strict_types=1);
session_start();

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/includes/functions.php';

// Check DB connection, redirect to setup if needed
try {
    $db = getDB();
    // Quick test
    $db->query('SELECT 1 FROM patients LIMIT 1');
} catch (PDOException $e) {
    if (!file_exists(__DIR__ . '/.setup_done')) {
        header('Location: /jithome/setup.php');
        exit;
    }
    die('<div style="font-family:sans-serif;padding:40px;color:#dc2626">
      <h2>⚠️ ไม่สามารถเชื่อมต่อฐานข้อมูลได้</h2>
      <p style="margin-top:12px">กรุณาตรวจสอบ <code>config/db.php</code></p>
      <pre style="margin-top:8px;background:#f3f4f6;padding:12px;border-radius:8px">' . htmlspecialchars($e->getMessage()) . '</pre>
      <p style="margin-top:12px"><a href="/jithome/setup.php">🔧 เรียกใช้ Setup อีกครั้ง</a></p>
    </div>');
}

// Page routing
$allowed = ['dashboard','patients','timeline','overview','visit','admin'];
$page    = $_GET['page'] ?? 'dashboard';
if (!in_array($page, $allowed, true)) $page = 'dashboard';

// Shared data for header
$hospitalName = getSetting('hospital_name', 'รพ.สต.สองคอน');

try {
    $overdueCount = (int)$db->query(
        "SELECT COUNT(*) FROM patient_status WHERE days_until < 0"
    )->fetchColumn();
    $todayCount = (int)$db->query(
        "SELECT COUNT(*) FROM patient_status WHERE days_until = 0"
    )->fetchColumn();
} catch (PDOException $e) {
    $overdueCount = 0;
    $todayCount   = 0;
}

require_once __DIR__ . '/includes/header.php';
require_once __DIR__ . '/pages/' . $page . '.php';
require_once __DIR__ . '/includes/footer.php';
