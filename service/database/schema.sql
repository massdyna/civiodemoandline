-- โครงฐานข้อมูลกลาง (MySQL 8 / MariaDB 10.5+) สำหรับย้ายจากข้อมูลในเบราว์เซอร์
-- ตรงกับโมดูลในหน้าเว็บ: ลูกค้า/เครื่อง/ประกัน/ตรวจเช็ก/งานซ่อม/อะไหล่/ประเมิน/แจ้งเตือน/ยอดขาย
SET NAMES utf8mb4;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(120) NOT NULL,
  role ENUM('exec','sales','tech','customer') NOT NULL,
  customer_id INT NULL,                     -- ใช้เมื่อ role = customer
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(120), phone VARCHAR(40), email VARCHAR(160),
  line_user_id VARCHAR(40) NULL,
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE machines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  model VARCHAR(20) NOT NULL,               -- CV15 ... CV1000, KAIBIN
  serial VARCHAR(60) NOT NULL UNIQUE,
  delivery_date DATE NOT NULL,
  install_date DATE NULL,
  warranty_months SMALLINT NOT NULL DEFAULT 12,
  inspect_months SMALLINT NOT NULL DEFAULT 3,
  location VARCHAR(255), note VARCHAR(255),
  warranty_end DATE AS (DATE_ADD(COALESCE(install_date, delivery_date), INTERVAL warranty_months MONTH)) STORED,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE inspections (
  id INT AUTO_INCREMENT PRIMARY KEY,
  machine_id INT NOT NULL, done_on DATE NOT NULL,
  technician VARCHAR(120), note TEXT,
  FOREIGN KEY (machine_id) REFERENCES machines(id)
);

CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,         -- เช่น RP-2611-001
  customer_id INT NOT NULL, machine_id INT NOT NULL,
  kind ENUM('repair','inspection') NOT NULL DEFAULT 'repair',
  symptom VARCHAR(120) NOT NULL, description TEXT,
  priority ENUM('ปกติ','ด่วน','เร่งด่วนมาก') NOT NULL DEFAULT 'ปกติ',
  status ENUM('ใหม่','นัดหมายแล้ว','กำลังดำเนินการ','รออะไหล่','เสร็จสิ้น','ปิดงาน') NOT NULL DEFAULT 'ใหม่',
  assignee VARCHAR(120), appointment_on DATE NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (machine_id) REFERENCES machines(id),
  INDEX (status), INDEX (machine_id)
);

CREATE TABLE ticket_history (
  id INT AUTO_INCREMENT PRIMARY KEY, ticket_id INT NOT NULL,
  status VARCHAR(30) NOT NULL, note TEXT, by_name VARCHAR(120),
  at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE parts (
  id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(160) NOT NULL, sku VARCHAR(60),
  stock INT NOT NULL DEFAULT 0, min_stock INT NOT NULL DEFAULT 0, unit VARCHAR(20) DEFAULT 'ชิ้น'
);

CREATE TABLE ticket_parts (
  ticket_id INT NOT NULL, part_id INT NOT NULL, qty INT NOT NULL,
  PRIMARY KEY (ticket_id, part_id),
  FOREIGN KEY (ticket_id) REFERENCES tickets(id), FOREIGN KEY (part_id) REFERENCES parts(id)
);

CREATE TABLE surveys (
  ticket_id INT PRIMARY KEY, score TINYINT NOT NULL CHECK (score BETWEEN 1 AND 5),
  comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);

CREATE TABLE notifications (
  id INT AUTO_INCREMENT PRIMARY KEY, customer_id INT NOT NULL,
  type VARCHAR(40) NOT NULL, dedupe_key VARCHAR(120) UNIQUE,
  body TEXT NOT NULL, status ENUM('รอส่ง','ส่งแล้ว','ส่งไม่สำเร็จ') DEFAULT 'รอส่ง',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, sent_at TIMESTAMP NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE online_sales (               -- เฟส 2 (ถ้ามี)
  id INT AUTO_INCREMENT PRIMARY KEY, sold_on DATE, platform VARCHAR(40), product VARCHAR(160),
  order_no VARCHAR(60), qty INT, amount DECIMAL(12,2), rating TINYINT NULL, review TEXT
);

-- ตัวอย่างคิวรีที่ตัวส่งอัตโนมัติ (cron รายวัน) ควรใช้: เครื่องที่จะหมดประกันใน 90 วัน
-- SELECT m.*, c.line_user_id FROM machines m JOIN customers c ON c.id = m.customer_id
--  WHERE m.warranty_end BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 90 DAY);
