-- ตารางเพิ่มสำหรับแจ้งเตือนนัดหมายล่วงหน้า + เช็กรายการอื่นของสินค้า
-- รันต่อจาก ../database/schema.sql และ schema-line.sql (ต้องรันก่อนใช้ cron-daily.php / import-json.php เวอร์ชันนี้)
SET NAMES utf8mb4;

-- เวลานัดพบลูกค้า (ไม่ใส่ก็ได้)
ALTER TABLE tickets ADD COLUMN appointment_time TIME NULL AFTER appointment_on;

-- บันทึกการตรวจเช็กว่าเป็นรายการอะไร (NULL หรือ 'ตรวจเช็กทั่วไป' = รอบตรวจเช็กปกติ)
ALTER TABLE inspections ADD COLUMN item_name VARCHAR(80) NULL AFTER done_on;

-- รายการเช็กอื่น ๆ ของสินค้า ทุกกี่เดือน (แก้ไขได้ — ค่าด้านล่างเป็นตัวอย่างเริ่มต้น ปรับให้ตรงกับเครื่องจริง)
CREATE TABLE check_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE,
  interval_months SMALLINT NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1
);
INSERT INTO check_items (name, interval_months) VALUES ('เปลี่ยนไส้กรองกลิ่น', 6), ('ตรวจสายพาน/ใบกวน', 12);
