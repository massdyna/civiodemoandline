<?php
/**
 * ประตูส่ง LINE (push) — เรียกจากหน้า "หลังการขาย" หรือระบบอื่นด้วย POST JSON
 *   {secret, to, text}            ส่งข้อความตัวอักษรธรรมดา (แบบเดิม)
 *   {secret, to, text, card:{…}}  ส่งเป็นการ์ดสวย ๆ (Flex) ถ้า card ผิดรูปจะถอยไปส่ง text
 *     card.kind = warranty | inspect  → name, label, date, days
 *     card.kind = appointment         → name, label, date, days, what?, time?, assignee?, code?
 *     card.kind = check               → name, label, item, date, days
 *     card.kind = ticket              → code, model, serial, symptom, status, created_at, appointment_on?, assignee?, note?
 */
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/flex.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: ' . rtrim(cfg('SITE_URL', 'https://civio.co.th'), '/'));
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo '{"ok":false}'; exit; }

$SECRET = cfg('CIVIO_SHARED_SECRET');
$in = json_decode(file_get_contents('php://input'), true) ?: [];
if ($SECRET === '' || !hash_equals($SECRET, (string)($in['secret'] ?? ''))) { http_response_code(403); echo '{"ok":false,"error":"forbidden"}'; exit; }

$to = trim((string)($in['to'] ?? ''));
$text = trim((string)($in['text'] ?? ''));
if (!preg_match('/^U[0-9a-f]{32}$/i', $to) || ($text === '' && empty($in['card'])) || mb_strlen($text) > 4800) {
  http_response_code(422); echo '{"ok":false,"error":"invalid"}'; exit;
}

$msgs = [];
$card = $in['card'] ?? null;
if (is_array($card)) {
  $k = $card['kind'] ?? '';
  if (in_array($k, ['warranty', 'inspect', 'appointment', 'check'], true)) $msgs[] = fx_reminder($k, $card);
  elseif ($k === 'ticket' && isset($card['code'], $card['status'])) $msgs[] = fx_ticket_update($card);
}
if (!$msgs) $msgs[] = ['type' => 'text', 'text' => $text];

[$code] = line_push($to, $msgs);
if ($code !== 200 && $msgs[0]['type'] === 'flex' && $text !== '') { [$code] = line_push($to, [['type' => 'text', 'text' => $text]]); }  // Flex ไม่ผ่าน → ส่งข้อความแทน
http_response_code($code === 200 ? 200 : 502);
echo json_encode(['ok' => $code === 200, 'line_status' => $code]);
