<?php
/**
 * นำเข้าข้อมูลจากไฟล์สำรอง JSON ของหน้า "หลังการขาย" (ตั้งค่า → ส่งออก JSON) เข้า MySQL
 *   php import-json.php civio-service-backup-YYYY-MM-DD.json
 * นำเข้า: ลูกค้า เครื่อง การตรวจเช็ก งานซ่อม+ประวัติ (ไม่รวมบัญชีผู้ใช้/อะไหล่/คิวแจ้งเตือน)
 * นัดที่ระบบเสนอไว้แต่ยังไม่ยืนยัน จะนำเข้าเป็นงานที่ยังไม่มีวันนัด (จึงไม่ถูกส่งเตือนลูกค้า)
 */
require_once __DIR__ . '/lib.php';
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$f = $argv[1] ?? ''; if (!is_file($f)) exit("ไม่พบไฟล์\n");
$j = json_decode(preg_replace('/^\xEF\xBB\xBF/', '', file_get_contents($f)), true); if (!$j) exit("ไฟล์ JSON ไม่ถูกต้อง\n");
$pdo = db(); $pdo->beginTransaction();
$cm = $mm = [];
foreach ($j['customers'] ?? [] as $c) {
  q('INSERT INTO customers (name, contact_name, phone, email, line_user_id, address) VALUES (?,?,?,?,?,?)',
    [$c['name'], $c['contact'] ?? null, $c['phone'] ?? null, $c['email'] ?? null, ($c['lineUserId'] ?? '') ?: null, $c['address'] ?? null]);
  $cm[$c['id']] = (int)$pdo->lastInsertId();
  if (!empty($c['lineUserId'])) q('INSERT INTO line_contacts (line_user_id, customer_id) VALUES (?,?) ON DUPLICATE KEY UPDATE customer_id=VALUES(customer_id)', [$c['lineUserId'], $cm[$c['id']]]);
}
foreach ($j['machines'] ?? [] as $m) {
  if (!isset($cm[$m['customerId']])) continue;
  q('INSERT IGNORE INTO machines (customer_id, model, serial, delivery_date, install_date, warranty_months, inspect_months, location, note) VALUES (?,?,?,?,?,?,?,?,?)',
    [$cm[$m['customerId']], $m['model'], $m['serial'], $m['deliveryDate'], ($m['installDate'] ?? '') ?: null, (int)($m['warrantyMonths'] ?? 12), (int)($m['inspectMonths'] ?? 3), $m['location'] ?? null, $m['note'] ?? null]);
  $mm[$m['id']] = (int)($pdo->lastInsertId() ?: q('SELECT id FROM machines WHERE serial=?', [$m['serial']])->fetchColumn());
}
foreach ($j['inspections'] ?? [] as $i) if (isset($mm[$i['machineId']])) q('INSERT INTO inspections (machine_id, done_on, item_name, technician, note) VALUES (?,?,?,?,?)', [$mm[$i['machineId']], $i['date'], $i['item'] ?? null, $i['by'] ?? null, $i['note'] ?? null]);
foreach ($j['settings']['checkItems'] ?? [] as $it) {   // รายการเช็กอื่น ๆ ที่ตั้งไว้ในหน้า ตั้งค่า
  if (!empty($it['name']) && (int)($it['months'] ?? 0) > 0) q('INSERT INTO check_items (name, interval_months) VALUES (?,?) ON DUPLICATE KEY UPDATE interval_months=VALUES(interval_months)', [$it['name'], (int)$it['months']]);
}
$nt = 0;
foreach ($j['tickets'] ?? [] as $t) {
  if (!isset($cm[$t['customerId']], $mm[$t['machineId']])) continue;
  q('INSERT IGNORE INTO tickets (code, customer_id, machine_id, kind, symptom, description, priority, status, assignee, appointment_on, appointment_time, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
    [$t['id'], $cm[$t['customerId']], $mm[$t['machineId']], $t['kind'] ?? 'repair', $t['symptom'], $t['desc'] ?? '', $t['priority'] ?? 'ปกติ', $t['status'], $t['assignee'] ?? null, empty($t['tentative']) ? (($t['appointment'] ?? '') ?: null) : null, empty($t['tentative']) ? (($t['appointmentTime'] ?? '') ?: null) : null, $t['createdAt']]);
  $tid = (int)$pdo->lastInsertId(); if (!$tid) continue; $nt++;
  foreach ($t['history'] ?? [] as $h) q('INSERT INTO ticket_history (ticket_id, status, note, by_name, at) VALUES (?,?,?,?,?)', [$tid, $h['status'], $h['note'] ?? '', $h['by'] ?? '', $h['at']]);
}
$pdo->commit();
echo 'นำเข้าแล้ว: ลูกค้า ' . count($cm) . ' เครื่อง ' . count($mm) . " งานซ่อม {$nt}\n";
