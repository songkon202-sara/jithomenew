<?php
// ─── Database Configuration ────────────────────────────────────
// Edit these values to match your MySQL server
define('DB_HOST',    'localhost');
define('DB_NAME',    'jithome');
define('DB_USER',    'root');
define('DB_PASS',    '');
define('DB_CHARSET', 'utf8mb4');

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn     = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
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
        $st  = $db->prepare('SELECT setting_value FROM settings WHERE setting_key = ?');
        $st->execute([$key]);
        $row = $st->fetch();
        return $row ? $row['setting_value'] : $default;
    } catch (PDOException $e) {
        return $default;
    }
}
