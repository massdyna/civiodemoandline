-- ตารางเพิ่มสำหรับ LINE chatbot (รันต่อจาก ../database/schema.sql)
SET NAMES utf8mb4;

-- ผู้ใช้ LINE แต่ละคน ผูกกับลูกค้า(องค์กร)ได้ — 1 องค์กรมีหลายคนได้
CREATE TABLE line_contacts (
  line_user_id VARCHAR(40) PRIMARY KEY,
  display_name VARCHAR(120) NULL,
  customer_id INT NULL,
  bind_fails TINYINT NOT NULL DEFAULT 0,
  blocked TINYINT(1) NOT NULL DEFAULT 0,
  followed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- รหัสผูกบัญชี ทีมขายออกให้ลูกค้า ใช้ได้ครั้งเดียว หมดอายุใน 7 วัน
CREATE TABLE line_bind_codes (
  code VARCHAR(12) PRIMARY KEY,
  customer_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- สถานะบทสนทนาหลายขั้น (แจ้งซ่อม ฯลฯ)
CREATE TABLE line_sessions (
  line_user_id VARCHAR(40) PRIMARY KEY,
  state VARCHAR(30) NOT NULL DEFAULT '',
  data TEXT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- กัน LINE ส่ง event ซ้ำ
CREATE TABLE line_events (
  event_id VARCHAR(64) PRIMARY KEY,
  at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
