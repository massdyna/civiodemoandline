<?php
require_once __DIR__ . '/config.php';

function db(): PDO {
  static $pdo = null;
  if (!$pdo) {
    $pdo = new PDO('mysql:host=' . cfg('DB_HOST', 'localhost') . ';dbname=' . cfg('DB_NAME') . ';charset=utf8mb4',
      cfg('DB_USER'), cfg('DB_PASS'),
      [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]);
  }
  return $pdo;
}
function q(string $sql, array $p = []): PDOStatement { $s = db()->prepare($sql); $s->execute($p); return $s; }

/** เรียก LINE Messaging API คืน [httpCode, bodyArray] */
function line_call(string $path, ?array $body = null, string $method = 'POST'): array {
  $ch = curl_init('https://api.line.me' . $path);
  $opt = [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10, CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'Authorization: Bearer ' . cfg('LINE_CHANNEL_TOKEN')]];
  if ($body !== null) $opt[CURLOPT_POSTFIELDS] = json_encode($body, JSON_UNESCAPED_UNICODE);
  curl_setopt_array($ch, $opt);
  $res = curl_exec($ch); $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
  return [$code, json_decode((string)$res, true) ?: []];
}
function line_reply(string $token, array $msgs): array { return line_call('/v2/bot/message/reply', ['replyToken' => $token, 'messages' => array_slice($msgs, 0, 5)]); }
function line_push(string $to, array $msgs): array { return line_call('/v2/bot/message/push', ['to' => $to, 'messages' => array_slice($msgs, 0, 5)]); }
function line_profile(string $uid): array { return line_call('/v2/bot/profile/' . rawurlencode($uid), null, 'GET')[1]; }

function th_date($d): string {
  $t = is_numeric($d) ? (int)$d : strtotime((string)$d);
  $m = ['', 'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  return date('j', $t) . ' ' . $m[(int)date('n', $t)] . ' ' . ((int)date('Y', $t) + 543);
}
function days_until(string $date): int { return (int)floor((strtotime($date . ' 00:00:00') - strtotime(date('Y-m-d') . ' 00:00:00')) / 86400); }

/** LINE User ID ทั้งหมดที่ผูกกับลูกค้ารายนี้ */
function contacts_of(int $cid): array {
  $a = q('SELECT line_user_id FROM line_contacts WHERE customer_id=? AND blocked=0', [$cid])->fetchAll(PDO::FETCH_COLUMN);
  $b = q("SELECT line_user_id FROM customers WHERE id=? AND line_user_id IS NOT NULL AND line_user_id<>''", [$cid])->fetchAll(PDO::FETCH_COLUMN);
  return array_values(array_unique(array_merge($a, $b)));
}
function staff_ids(): array { return array_values(array_filter(array_map('trim', explode(',', cfg('STAFF_LINE_IDS'))))); }

/** เครื่องของลูกค้า พร้อมวันหมดประกัน/รอบตรวจเช็กถัดไป */
function machines_of(int $cid): array {
  $rows = q('SELECT m.*, (SELECT MAX(done_on) FROM inspections i WHERE i.machine_id=m.id AND (i.item_name IS NULL OR i.item_name=\'ตรวจเช็กทั่วไป\')) AS last_insp FROM machines m WHERE m.customer_id=? ORDER BY m.id', [$cid])->fetchAll();
  foreach ($rows as &$m) {
    $m['days_left'] = days_until($m['warranty_end']);
    $base = $m['last_insp'] ?: ($m['install_date'] ?: $m['delivery_date']);
    $m['next_inspect'] = date('Y-m-d', strtotime($base . ' +' . (int)$m['inspect_months'] . ' months'));
    $m['inspect_days'] = days_until($m['next_inspect']);
  }
  return $rows;
}
