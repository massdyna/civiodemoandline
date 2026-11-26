<?php
/**
 * ออกรหัสผูกบัญชี LINE ให้ลูกค้า (ใช้ครั้งเดียว หมดอายุ 7 วัน)
 *   CLI:  php make-bind-code.php <customer_id>
 *   URL:  POST make-bind-code.php  {secret, customer_id}   (secret = CIVIO_SHARED_SECRET)
 */
require_once __DIR__ . '/lib.php';

if (PHP_SAPI === 'cli') { $cid = (int)($argv[1] ?? 0); }
else {
  header('Content-Type: application/json; charset=utf-8');
  $in = json_decode(file_get_contents('php://input'), true) ?: [];
  $S = cfg('CIVIO_SHARED_SECRET');
  if ($_SERVER['REQUEST_METHOD'] !== 'POST' || $S === '' || !hash_equals($S, (string)($in['secret'] ?? ''))) { http_response_code(403); exit('{"ok":false}'); }
  $cid = (int)($in['customer_id'] ?? 0);
}
if (!q('SELECT 1 FROM customers WHERE id=?', [$cid])->fetch()) { if (PHP_SAPI === 'cli') exit("ไม่พบลูกค้า id={$cid}\n"); http_response_code(404); exit('{"ok":false}'); }
$alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // ตัดตัวที่สับสน 0/O 1/I
$code = ''; for ($i = 0; $i < 8; $i++) $code .= $alpha[random_int(0, strlen($alpha) - 1)];
q('INSERT INTO line_bind_codes (code, customer_id, expires_at) VALUES (?,?, NOW() + INTERVAL 7 DAY)', [$code, $cid]);
if (PHP_SAPI === 'cli') echo "รหัสผูกบัญชี: {$code}  (ให้ลูกค้าพิมพ์ใน LINE: ผูกบัญชี {$code})\n";
else echo json_encode(['ok' => true, 'code' => $code]);
