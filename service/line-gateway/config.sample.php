<?php
// คัดลอกไฟล์นี้เป็น config.local.php แล้วกรอกค่าจริง (ห้ามอัปโหลดขึ้น git/ที่สาธารณะ)
return [
  'LINE_CHANNEL_TOKEN'  => '',   // Channel access token (long-lived)
  'LINE_CHANNEL_SECRET'  => '',   // Channel secret (ใช้ตรวจลายเซ็น webhook)
  'CIVIO_SHARED_SECRET'  => '',   // รหัสลับสุ่มยาว ๆ ให้ตรงกับหน้า ตั้งค่า → รหัสลับ ของระบบ
  'CRON_KEY'             => '',   // รหัสสำหรับเรียก cron ผ่าน URL (ถ้าใช้ CLI ไม่ต้องกรอก)
  'DB_HOST' => 'localhost', 'DB_NAME' => '', 'DB_USER' => '', 'DB_PASS' => '',
  'STAFF_LINE_IDS'       => '',   // LINE User ID ของทีมงานที่ต้องการให้แจ้งเตือนงานใหม่ (คั่นด้วย ,)
  'SITE_URL'             => 'https://civio.co.th',
  'COMPANY_PHONE'        => '086-351-7534',
];
