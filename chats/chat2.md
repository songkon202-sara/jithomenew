# ช่องทางเชื่อมข้อมูล

_Started 2026-05-11 06:09 UTC_

---

## User

เพิ่มช่องทางการเชื่อมข้อมูลหรือลิ้งข้อมูล

## Assistant

_[tool: list_files]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

เพิ่มส่วน **🔗 เชื่อมต่อข้อมูล** ในหน้าแอดมินแล้ว ประกอบด้วยช่องทาง:

- 📥 **นำเข้าไฟล์** Excel / CSV
- 📤 **ส่งออกข้อมูล** Excel / PDF / JSON
- 🟢 **Google Sheets** — ซิงค์อัตโนมัติ พร้อม URL และปุ่มซิงค์
- 🏥 **HOSxP / JHCIS** — ระบบฐานข้อมูล รพ.สต.
- 💬 **LINE Notify / OA** — แจ้งเตือนกลุ่ม อสม. พร้อม Access Token
- ✈️ **Telegram Bot** — พร้อม Chat ID
- ⚡ **REST API / Webhook** — สำหรับนักพัฒนา
- ☁️ **Cloud Backup** — สำรองข้อมูลอัตโนมัติ

แต่ละช่องทางมีสถานะ (Active/Inactive), toggle เปิด-ปิด และช่องกรอกข้อมูลที่จำเป็น

## User

Apply drawing

## Assistant

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

เพิ่มธงเตือนผู้ป่วยเกินวันนัดในแถบด้านข้างแล้ว ใต้เมนูจะเห็นการ์ดสีแดงพร้อมธงสามเหลี่ยมและปุ่ม "ดูรายการ →" ที่ลิงก์ไปยังหน้าตารางนัด

## User

Apply drawing

## Assistant

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

เพิ่มปุ่มลัด 2 ปุ่มในแถบด้านข้างแล้ว: **เยี่ยมบ้านวันนี้** และ **รายงานสรุป**

## User

Apply drawing

## Assistant

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

ขยายช่องหมายเหตุเป็น textarea (3 บรรทัด, ปรับขนาดได้) และเพิ่มปุ่มลัด preset ข้อความที่ใช้บ่อย เช่น Invega, DEPO-A, FLUPENTIXOL, อาการคงที่, ไม่มา, ส่งต่อ รพ. — กดเพื่อเติมข้อความได้ทันที

