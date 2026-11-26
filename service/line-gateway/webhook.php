<?php
/**
 * LINE chatbot webhook — ตั้ง URL นี้ที่ LINE Developers → Messaging API → Webhook URL
 * ตรวจลายเซ็น → ตอบกลับด้วย Flex Message ตามเมนู/คำสั่ง/ปุ่มบน Rich Menu
 */
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/flex.php';

const SYMPTOMS = ['เครื่องไม่ทำงาน', 'มีกลิ่นเหม็น', 'เสียงดังผิดปกติ', 'ใบกวนติด/ขัด', 'จอแสดงผลมีปัญหา', 'ฝาปิดไม่สนิท', 'ความร้อนไม่ขึ้น', 'ไส้กรองอุดตัน', 'อื่น ๆ'];

$raw = file_get_contents('php://input');
$secret = cfg('LINE_CHANNEL_SECRET');
$sig = $_SERVER['HTTP_X_LINE_SIGNATURE'] ?? '';
if ($secret === '' || !hash_equals(base64_encode(hash_hmac('sha256', $raw, $secret, true)), $sig)) { http_response_code(403); exit; }

http_response_code(200); header('Content-Type: text/plain'); echo 'OK';
if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();

foreach ((json_decode($raw, true)['events'] ?? []) as $ev) {
  try { handle($ev); } catch (Throwable $e) { error_log('civio-line: ' . $e->getMessage()); }
}

/* ======================= ตัวจัดการ event ======================= */
function handle(array $ev): void {
  $eid = $ev['webhookEventId'] ?? '';
  if ($eid !== '' && q('INSERT IGNORE INTO line_events (event_id) VALUES (?)', [$eid])->rowCount() === 0) return;
  $uid = $ev['source']['userId'] ?? '';
  $rt = $ev['replyToken'] ?? '';
  if ($uid === '') return;
  switch ($ev['type'] ?? '') {
    case 'follow':
      $p = line_profile($uid);
      q('INSERT INTO line_contacts (line_user_id, display_name) VALUES (?,?) ON DUPLICATE KEY UPDATE display_name=VALUES(display_name), blocked=0', [$uid, $p['displayName'] ?? null]);
      $c = customer_of($uid);
      line_reply($rt, [fx_welcome(null, (bool)$c, $c['name'] ?? '')]);
      break;
    case 'unfollow':
      q('UPDATE line_contacts SET blocked=1 WHERE line_user_id=?', [$uid]);
      break;
    case 'message':
      if (($ev['message']['type'] ?? '') === 'text') on_text($rt, $uid, trim($ev['message']['text']));
      else line_reply($rt, [txt('ขออภัยครับ ตอนนี้รับได้เฉพาะข้อความตัวอักษร ลองกดเมนูด้านล่างได้เลยครับ', menu_quick())]);
      break;
    case 'postback':
      parse_str($ev['postback']['data'] ?? '', $a);
      on_action($rt, $uid, $a);
      break;
  }
}

/* ======================= ข้อมูลช่วย ======================= */
function customer_of(string $uid): ?array {
  $r = q('SELECT c.* FROM line_contacts lc JOIN customers c ON c.id=lc.customer_id WHERE lc.line_user_id=?', [$uid])->fetch();
  if ($r) return $r;
  $r = q('SELECT * FROM customers WHERE line_user_id=?', [$uid])->fetch();
  return $r ?: null;
}
function menu_quick(): array { return [pb('🛡️ เช็กประกัน', 'act=warranty'), pb('🔧 แจ้งซ่อม', 'act=repair'), pb('📋 ติดตามงาน', 'act=status'), pb('📞 ติดต่อเรา', 'act=contact')]; }
function sess_get(string $uid): array { $r = q('SELECT state, data FROM line_sessions WHERE line_user_id=?', [$uid])->fetch(); return $r ? ['state' => $r['state'], 'data' => json_decode((string)$r['data'], true) ?: []] : ['state' => '', 'data' => []]; }
function sess_set(string $uid, string $state, array $data = []): void { q('REPLACE INTO line_sessions (line_user_id, state, data) VALUES (?,?,?)', [$uid, $state, json_encode($data, JSON_UNESCAPED_UNICODE)]); }
function sess_clear(string $uid): void { q('DELETE FROM line_sessions WHERE line_user_id=?', [$uid]); }
function need_bind(string $rt): void {
  line_reply($rt, [fx_msg('ผูกบัญชีก่อนใช้งาน', fx_bubble('ผูกบัญชีลูกค้า', 'ขั้นตอนแรก', [
    fx_t('เมนูนี้สำหรับลูกค้าที่ลงทะเบียนเครื่องกับ CiViO แล้ว', ['weight' => 'bold']),
    fx_t('ขอรหัสผูกบัญชีจากทีมขาย แล้วพิมพ์ในแชตนี้ เช่น', ['color' => FX_MUTED, 'size' => 'xs']),
    fx_t('ผูกบัญชี ABCD2345', ['weight' => 'bold', 'color' => FX_FOREST]),
  ], [fx_btn(uri('โทรขอรหัสจากทีมงาน', 'tel:' . preg_replace('/\D/', '', cfg('COMPANY_PHONE', '0863517534'))), false)]))]);
}
function pick_machine(array $ms, int $id): ?array { foreach ($ms as $m) if ((int)$m['id'] === $id) return $m; return null; }
function mlabel(array $m): string { return $m['model'] . ' · ' . $m['serial']; }

/* ======================= ข้อความตัวอักษร ======================= */
function on_text(string $rt, string $uid, string $t): void {
  $n = mb_strtolower($t);
  if (preg_match('/^ผูก(?:บัญชี)?\s*([A-Za-z0-9]{6,12})$/u', $t, $m)) { bind($rt, $uid, strtoupper($m[1])); return; }
  if (in_array($n, ['ยกเลิก', 'cancel'])) { sess_clear($uid); line_reply($rt, [txt('ยกเลิกแล้วครับ', menu_quick())]); return; }

  $s = sess_get($uid);
  if ($s['state'] === 'repair_desc') { $s['data']['desc'] = mb_substr($t, 0, 500); ask_confirm($rt, $uid, $s['data']); return; }
  if ($s['state'] === 'rate_comment') {
    q('UPDATE surveys s JOIN tickets t ON t.id=s.ticket_id SET s.comment=? WHERE t.code=?', [mb_substr($t, 0, 500), $s['data']['t'] ?? '']);
    sess_clear($uid); line_reply($rt, [txt('ขอบคุณสำหรับข้อเสนอแนะครับ ทีมงานจะนำไปปรับปรุงบริการ 🙏', menu_quick())]); return;
  }
  $map = [
    'warranty' => ['ประกัน', 'warranty'], 'repair' => ['แจ้งซ่อม', 'ซ่อม', 'เสีย', 'repair'], 'status' => ['สถานะ', 'ติดตาม', 'งานของฉัน', 'status'],
    'inspect' => ['ตรวจเช็ก', 'ตรวจเช็ค', 'นัด', 'บำรุงรักษา'], 'contact' => ['ติดต่อ', 'โทร', 'เบอร์', 'contact'],
    'products' => ['สินค้า', 'บริการ', 'ราคา', 'รุ่น', 'คอร์ส'], 'menu' => ['เมนู', 'สวัสดี', 'หวัดดี', 'hi', 'hello', 'menu', 'help'],
  ];
  foreach ($map as $act => $words) foreach ($words as $w) if (mb_strpos($n, $w) !== false) { on_action($rt, $uid, ['act' => $act]); return; }
  line_reply($rt, [txt('ขออภัยครับ ยังไม่เข้าใจข้อความนี้ 🙏 เลือกเมนูด้านล่าง หรือพิมพ์ "เมนู" เพื่อดูทั้งหมดได้เลยครับ', menu_quick())]);
}

/* ======================= ปุ่ม/คำสั่ง ======================= */
function on_action(string $rt, string $uid, array $a): void {
  $act = $a['act'] ?? 'menu';
  $c = customer_of($uid);
  if (in_array($act, ['menu', 'contact', 'products', 'cancel'])) {
    if ($act === 'cancel') { sess_clear($uid); line_reply($rt, [txt('ยกเลิกแล้วครับ', menu_quick())]); return; }
    if ($act === 'contact') { line_reply($rt, [fx_contact()]); return; }
    if ($act === 'products') { line_reply($rt, [fx_products()]); return; }
    line_reply($rt, [fx_welcome(null, (bool)$c, $c['name'] ?? '')]); return;
  }
  if (!$c) { need_bind($rt); return; }
  $cid = (int)$c['id'];

  switch ($act) {
    case 'warranty':
      $ms = machines_of($cid);
      if (!$ms) { line_reply($rt, [txt('ยังไม่พบเครื่องที่ลงทะเบียนกับบัญชีนี้ครับ กรุณาติดต่อทีมขาย', [pb('📞 ติดต่อเรา', 'act=contact')])]); return; }
      line_reply($rt, [txt('เครื่องของ ' . $c['name'] . ' ครับ 👇'), fx_msg('สถานะประกันเครื่อง', fx_carousel(array_map('fx_machine_card', $ms)))]);
      break;

    case 'status':
      $rows = q('SELECT t.*, m.model, m.serial, (SELECT h.note FROM ticket_history h WHERE h.ticket_id=t.id ORDER BY h.id DESC LIMIT 1) AS note FROM tickets t JOIN machines m ON m.id=t.machine_id WHERE t.customer_id=? ORDER BY (t.status IN (\'ปิดงาน\')), t.created_at DESC LIMIT 8', [$cid])->fetchAll();
      if (!$rows) { line_reply($rt, [txt('ยังไม่มีรายการแจ้งซ่อมครับ', [pb('🔧 แจ้งซ่อม', 'act=repair')])]); return; }
      $rated = q('SELECT t.code FROM surveys s JOIN tickets t ON t.id=s.ticket_id WHERE t.customer_id=?', [$cid])->fetchAll(PDO::FETCH_COLUMN);
      $b = array_map(fn($t) => fx_ticket_card($t, in_array($t['status'], ['เสร็จสิ้น', 'ปิดงาน']) && !in_array($t['code'], $rated)), $rows);
      line_reply($rt, [fx_msg('ติดตามงานซ่อม', fx_carousel($b))]);
      break;

    case 'repair': case 'inspect':
      $ms = machines_of($cid);
      if (!$ms) { line_reply($rt, [txt('ยังไม่พบเครื่องที่ลงทะเบียนกับบัญชีนี้ครับ กรุณาติดต่อทีมขาย', [pb('📞 ติดต่อเรา', 'act=contact')])]); return; }
      $m = isset($a['m']) ? pick_machine($ms, (int)$a['m']) : (count($ms) === 1 ? $ms[0] : null);
      if (!$m) {
        $quick = array_map(fn($x) => pb(mb_substr(mlabel($x), 0, 20), 'act=' . $act . '&m=' . $x['id'], mlabel($x)), array_slice($ms, 0, 12));
        line_reply($rt, [txt('เลือกเครื่องที่ต้องการครับ', $quick)]); return;
      }
      if ($act === 'inspect') {
        ask_confirm($rt, $uid, ['m' => (int)$m['id'], 'kind' => 'inspection', 'sym' => 'ตรวจเช็กตามรอบ', 'desc' => '']); return;
      }
      sess_set($uid, 'repair_symptom', ['m' => (int)$m['id'], 'kind' => 'repair']);
      $quick = []; foreach (SYMPTOMS as $i => $s) $quick[] = pb($s, 'act=sym&i=' . $i);
      line_reply($rt, [txt('เครื่อง ' . mlabel($m) . "\nมีอาการอย่างไรครับ?", $quick)]);
      break;

    case 'sym':
      $s = sess_get($uid);
      $i = (int)($a['i'] ?? -1);
      if ($s['state'] !== 'repair_symptom' || !isset(SYMPTOMS[$i])) { line_reply($rt, [txt('เริ่มแจ้งซ่อมใหม่ได้จากปุ่มด้านล่างครับ', [pb('🔧 แจ้งซ่อม', 'act=repair')])]); return; }
      $s['data']['sym'] = SYMPTOMS[$i];
      sess_set($uid, 'repair_desc', $s['data']);
      line_reply($rt, [txt('พิมพ์รายละเอียดเพิ่มเติมได้เลยครับ (เช่น เริ่มเป็นเมื่อไหร่ มีรหัสแจ้งเตือนไหม) หรือกด "ข้าม"', [pb('ข้าม', 'act=skipdesc'), pb('ยกเลิก', 'act=cancel')])]);
      break;

    case 'skipdesc':
      $s = sess_get($uid);
      if ($s['state'] !== 'repair_desc') { line_reply($rt, [fx_welcome(null, true, $c['name'])]); return; }
      ask_confirm($rt, $uid, $s['data']);
      break;

    case 'confirm':
      $s = sess_get($uid);
      if ($s['state'] !== 'confirm') { line_reply($rt, [txt('ไม่พบรายการที่รอยืนยันครับ', menu_quick())]); return; }
      $d = $s['data'];
      $m = pick_machine(machines_of($cid), (int)$d['m']);   // ต้องเป็นเครื่องของลูกค้ารายนี้เท่านั้น
      if (!$m) { sess_clear($uid); line_reply($rt, [txt('ไม่พบเครื่องดังกล่าวครับ', menu_quick())]); return; }
      $t = create_ticket($cid, (int)$m['id'], $d['kind'], $d['sym'], $d['desc'] ?? '', $d['priority'] ?? 'ปกติ');
      sess_clear($uid);
      $t += ['model' => $m['model'], 'serial' => $m['serial'], 'note' => null, 'appointment_on' => null, 'assignee' => null];
      line_reply($rt, [txt($d['kind'] === 'inspection' ? 'รับเรื่องนัดตรวจเช็กแล้วครับ ทีมงานจะติดต่อกลับเพื่อนัดวันเวลา ✅' : 'รับเรื่องแล้วครับ ทีมช่างจะติดต่อกลับโดยเร็ว ✅'), fx_msg('รับเรื่องแล้ว ' . $t['code'], fx_ticket_card($t))]);
      foreach (staff_ids() as $sid) line_push($sid, [txt("🔔 งานใหม่ {$t['code']}\n{$c['name']}\n{$m['model']} · {$m['serial']}\nอาการ: {$d['sym']}" . (($d['priority'] ?? 'ปกติ') !== 'ปกติ' ? "\nความเร่งด่วน: {$d['priority']}" : ''))]);
      break;

    case 'ratemenu':
      $quick = []; foreach ([5, 4, 3, 2, 1] as $n) $quick[] = pb(str_repeat('⭐', $n), 'act=rate&t=' . ($a['t'] ?? '') . '&s=' . $n, str_repeat('⭐', $n));
      line_reply($rt, [txt('งาน ' . ($a['t'] ?? '') . ' พอใจบริการแค่ไหนครับ?', $quick)]);
      break;

    case 'rate':
      $score = max(1, min(5, (int)($a['s'] ?? 0)));
      $t = q('SELECT id, code FROM tickets WHERE code=? AND customer_id=? AND status IN (\'เสร็จสิ้น\',\'ปิดงาน\')', [$a['t'] ?? '', $cid])->fetch();
      if (!$t) { line_reply($rt, [txt('ไม่พบงานที่ให้คะแนนได้ครับ', menu_quick())]); return; }
      q('INSERT INTO surveys (ticket_id, score) VALUES (?,?) ON DUPLICATE KEY UPDATE score=VALUES(score)', [$t['id'], $score]);
      sess_set($uid, 'rate_comment', ['t' => $t['code']]);
      line_reply($rt, [txt('ขอบคุณสำหรับ ' . $score . ' ดาวครับ 🙏 มีข้อเสนอแนะเพิ่มเติมพิมพ์ได้เลย หรือกด "ไม่มี"', [pb('ไม่มี', 'act=cancel', 'ไม่มี')])]);
      break;

    default:
      line_reply($rt, [fx_welcome(null, true, $c['name'])]);
  }
}

function ask_confirm(string $rt, string $uid, array $d): void {
  $c = customer_of($uid);
  $m = pick_machine(machines_of((int)$c['id']), (int)$d['m']);
  if (!$m) { line_reply($rt, [txt('ไม่พบเครื่องดังกล่าวครับ', menu_quick())]); return; }
  $d['priority'] = ($d['kind'] === 'repair' && ($d['sym'] ?? '') === SYMPTOMS[0]) ? 'ด่วน' : 'ปกติ';
  sess_set($uid, 'confirm', $d);
  line_reply($rt, [fx_confirm(mlabel($m), $d['sym'], $d['desc'] ?? '', $d['priority'])]);
}

function create_ticket(int $cid, int $mid, string $kind, string $sym, string $desc, string $prio): array {
  $prefix = 'RP-' . date('ym') . '-';
  for ($try = 0; $try < 5; $try++) {
    $n = (int)q('SELECT COUNT(*) FROM tickets WHERE code LIKE ?', [$prefix . '%'])->fetchColumn() + 1 + $try;
    $code = $prefix . str_pad((string)$n, 3, '0', STR_PAD_LEFT);
    try {
      q('INSERT INTO tickets (code, customer_id, machine_id, kind, symptom, description, priority) VALUES (?,?,?,?,?,?,?)', [$code, $cid, $mid, $kind, $sym, $desc, $prio]);
      $id = (int)db()->lastInsertId();
      q('INSERT INTO ticket_history (ticket_id, status, note, by_name) VALUES (?,?,?,?)', [$id, 'ใหม่', 'ลูกค้าแจ้งผ่าน LINE', 'ลูกค้า (LINE)']);
      return ['code' => $code, 'symptom' => $sym, 'status' => 'ใหม่', 'created_at' => date('Y-m-d')];
    } catch (PDOException $e) { if ($try === 4) throw $e; }   // เลขซ้ำ → ลองเลขถัดไป
  }
  throw new RuntimeException('ticket');
}

function bind(string $rt, string $uid, string $code): void {
  $me = q('SELECT bind_fails FROM line_contacts WHERE line_user_id=?', [$uid])->fetch();
  if (!$me) { q('INSERT INTO line_contacts (line_user_id) VALUES (?)', [$uid]); $me = ['bind_fails' => 0]; }
  if ((int)$me['bind_fails'] >= 5) { line_reply($rt, [txt('ใส่รหัสผิดหลายครั้งแล้วครับ กรุณาติดต่อทีมงานเพื่อขอรหัสใหม่', [pb('📞 ติดต่อเรา', 'act=contact')])]); return; }
  $r = q('SELECT b.customer_id, c.name FROM line_bind_codes b JOIN customers c ON c.id=b.customer_id WHERE b.code=? AND b.used_at IS NULL AND b.expires_at>NOW()', [$code])->fetch();
  if (!$r) {
    q('UPDATE line_contacts SET bind_fails=bind_fails+1 WHERE line_user_id=?', [$uid]);
    line_reply($rt, [txt('รหัสไม่ถูกต้องหรือหมดอายุแล้วครับ ตรวจสอบอีกครั้ง หรือขอรหัสใหม่จากทีมขาย')]); return;
  }
  q('UPDATE line_contacts SET customer_id=?, bind_fails=0 WHERE line_user_id=?', [$r['customer_id'], $uid]);
  q('UPDATE line_bind_codes SET used_at=NOW() WHERE code=?', [$code]);
  line_reply($rt, [txt('ผูกบัญชีสำเร็จ ✅'), fx_welcome(null, true, $r['name'])]);
}
