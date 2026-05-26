# JitHome — ระบบติดตามผู้ป่วยจิตเวช

ระบบสำหรับอาสาสมัครสาธารณสุขประจำหมู่บ้าน (อสม.) ใช้ติดตามผู้ป่วยจิตเวชในการฉีดยาและนัดหมาย

## ความต้องการของระบบ

- PHP 8.0+
- MySQL 5.7+ หรือ MariaDB 10.3+
- Web Server (Apache / Nginx) หรือ `php -S`

## การติดตั้ง

### 1. วางไฟล์

```
/var/www/html/jithome/    ← Apache/Nginx
```

หรือทดสอบด้วย built-in server:
```bash
cd /path/to/jithome
php -S localhost:8000
```

### 2. ตั้งค่าฐานข้อมูล

เปิดเบราว์เซอร์ไปที่:
```
http://localhost:8000/setup.php
```

กรอก MySQL host, ชื่อฐานข้อมูล, username, password แล้วคลิก **เริ่ม Setup**

ระบบจะ:
- สร้างฐานข้อมูล `jithome` อัตโนมัติ
- สร้างตารางทั้งหมด
- นำเข้าข้อมูลผู้ป่วย 167 รายการ (~26 ราย)
- สร้างข้อมูลตัวอย่างเยี่ยมบ้าน

### 3. ใช้งาน

```
http://localhost:8000/
```

## โครงสร้างไฟล์

```
jithome/
├── index.php          ← หน้าหลัก + router
├── setup.php          ← ติดตั้งครั้งแรก (ลบหลัง setup)
├── config/db.php      ← ค่าเชื่อมต่อ MySQL
├── includes/          ← functions, header, footer
├── pages/             ← 6 หน้า: dashboard, patients, timeline, overview, visit, admin
├── api/               ← JSON endpoints
└── assets/            ← style.css, app.js
```

## หน้าในระบบ

| หน้า | URL | รายละเอียด |
|------|-----|-----------|
| หน้าหลัก | `?page=dashboard` | สรุปวันนี้, สถิติกลุ่มสี, รายการเกินนัด |
| ผู้ป่วย | `?page=patients` | ค้นหา, กรองกลุ่มสี/หมู่บ้าน |
| ตารางนัด | `?page=timeline` | เรียงตามวันนัด |
| ภาพรวม | `?page=overview` | กราฟ Donut, แท่งหมู่บ้าน, เส้น trend |
| เยี่ยมบ้าน | `?page=visit` | บันทึกเยี่ยมบ้าน (เจ้าหน้าที่/อสม.) |
| แอดมิน | `?page=admin` | บันทึกนัดฉีดยา, ตั้งค่า |

## API Endpoints

| Method | URL | รายละเอียด |
|--------|-----|-----------|
| GET | `/api/patients.php?action=detail&id=X` | ข้อมูลผู้ป่วย + ประวัติ |
| POST | `/api/records.php` | เพิ่มนัดฉีดยา |
| GET/POST | `/api/visits.php` | รายการ/เพิ่มเยี่ยมบ้าน |
| POST | `/api/settings.php` | บันทึกการตั้งค่า |
| GET | `/api/export.php?format=csv` | ส่งออก CSV/JSON |
