<?php
// ─── Supabase / PostgreSQL Configuration ──────────────────────
// กรอกข้อมูล Supabase ของคุณ:
//   Dashboard → Settings → Database → Connection string (PHP PDO)
//
// ตัวอย่าง:
//   host=db.xxxxxxxxxxxx.supabase.co port=5432 dbname=postgres
//   user=postgres password=YOUR_PASSWORD

define('DB_HOST',    'db.xxxxxxxxxxxx.supabase.co');  // <── เปลี่ยนตรงนี้
define('DB_PORT',    '5432');
define('DB_NAME',    'postgres');
define('DB_USER',    'postgres');
define('DB_PASS',    'YOUR_DB_PASSWORD');              // <── เปลี่ยนตรงนี้

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf(
            'pgsql:host=%s;port=%s;dbname=%s',
            DB_HOST, DB_PORT, DB_NAME
        );
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
    }
    return $pdo;
}

// Helper: return a setting value from the settings table
function getSetting(string $key, string $default = ''): string {
    try {
        $db  = getDB();
        $st  = $db->prepare('SELECT setting_value FROM settings WHERE setting_key = $1');
        $st->execute([$key]);
        $row = $st->fetch();
        return $row ? $row['setting_value'] : $default;
    } catch (PDOException $e) {
        return $default;
    }
}
