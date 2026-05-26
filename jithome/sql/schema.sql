-- JitHome Database Schema
-- Thai Psychiatric Patient Tracking System
-- Run this file once to initialize the database

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE DATABASE IF NOT EXISTS jithome
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jithome;

-- ─── TABLES ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS patients (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(200) NOT NULL,
  village     VARCHAR(50)  DEFAULT '',
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_name (name(191))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS injection_records (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  patient_id     INT          NOT NULL,
  injection_date DATE         NOT NULL,
  group_color    ENUM('red','yellow','green') NOT NULL DEFAULT 'yellow',
  group_label    VARCHAR(50)  DEFAULT '',
  interval_str   VARCHAR(30)  DEFAULT '1 เดือน',
  interval_days  INT          DEFAULT 30,
  note           TEXT,
  created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  KEY idx_patient_date (patient_id, injection_date),
  FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS home_visits (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  patient_id   INT,
  patient_name VARCHAR(200) DEFAULT '',
  village      VARCHAR(50)  DEFAULT '',
  visit_type   ENUM('staff','aosomo') NOT NULL DEFAULT 'aosomo',
  visit_date   DATE         NOT NULL,
  visitor      VARCHAR(100) DEFAULT '',
  checks_json  TEXT,
  score        INT          DEFAULT 0,
  note         TEXT,
  refer        TINYINT(1)   DEFAULT 0,
  next_appt    DATE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
  setting_key   VARCHAR(100) PRIMARY KEY,
  setting_value TEXT         DEFAULT '',
  updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── DEFAULT SETTINGS ─────────────────────────────────────────

INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
  ('hospital_name',   'รพ.สต.สองคอน'),
  ('alert_days',      '1'),
  ('telegram_bot',    '@JitHomeBot'),
  ('telegram_chatid', '-1001234567890'),
  ('line_token',      ''),
  ('sheets_url',      ''),
  ('cloud_backup',    '1'),
  ('hosxp_enabled',   '1'),
  ('line_enabled',    '1'),
  ('telegram_enabled','1');

-- ─── VIEWS ────────────────────────────────────────────────────

-- Latest status per patient (next appointment date, days until)
CREATE OR REPLACE VIEW patient_status AS
SELECT
  p.id,
  p.name,
  p.village,
  ir.id          AS record_id,
  ir.injection_date AS last_date,
  ir.group_color,
  ir.group_label,
  ir.interval_str,
  ir.interval_days,
  ir.note,
  DATE_ADD(ir.injection_date, INTERVAL ir.interval_days DAY) AS next_date,
  DATEDIFF(
    DATE_ADD(ir.injection_date, INTERVAL ir.interval_days DAY),
    CURDATE()
  ) AS days_until
FROM patients p
INNER JOIN injection_records ir ON ir.id = (
  SELECT id FROM injection_records r2
  WHERE r2.patient_id = p.id
  ORDER BY injection_date DESC, id DESC
  LIMIT 1
);

-- Monthly trend for line chart
CREATE OR REPLACE VIEW monthly_trend AS
SELECT
  DATE_FORMAT(injection_date, '%Y-%m')     AS month_key,
  COUNT(*)                                  AS total,
  SUM(group_color = 'red')                  AS red_count,
  SUM(group_color = 'yellow')               AS yellow_count,
  SUM(group_color = 'green')                AS green_count
FROM injection_records
GROUP BY DATE_FORMAT(injection_date, '%Y-%m')
ORDER BY month_key;

SET FOREIGN_KEY_CHECKS = 1;
