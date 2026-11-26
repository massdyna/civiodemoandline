<?php
/**
 * ตัวส่งแจ้งเตือนอัตโนมัติรายวัน — ตั้ง cron ให้รันทุกเช้า เช่น 08:00
 *   php /path/to/service/line-gateway/cron-daily.php
 * (เรียกผ่าน URL ได้ถ้าส่ง ?key=CRON_KEY) แต่ละเรื่องส่งครั้งเดียว กันซ้ำด้วย dedupe_key
 */
require_once __DIR__ . '/lib.php';
require_once __DIR__ . '/flex.php';

if (PHP_SAPI !== 'cli' && (cfg('CRON_KEY') === '' || !hash_equals(cfg('CRON_KEY'), (string)($_GET['key'] ?? '')))) { http_response_code(403); exit('forbidden'); }

$WARN_DAYS = [90, 30, 7];   // แจ้งเมื่อเหลือไม่เกินกี่วัน (แจ้งทีละขั้น)
$INSPECT_NOTICE = 14;       // แจ้งก่อนถึงรอบตรวจเช็กกี่วัน
$APPT_NOTICE = [3];         // แจ้งก่อนวันนัดพบลูกค้ากี่วัน แจ้งทีละขั้น เช่น [3, 1] = ก่อน 3 วัน และก่อน 1 วัน
$CHECK_NOTICE = 3;          // แจ้งก่อนถึงกำหนดเช็กรายการอื่น (ตาราง check_items) กี่วัน
$sent = $queued = 0;

function notify(int $cid, string $type, string $key, array $card, string $fallback): void {
  global $sent, $queued;
  if (q('INSERT IGNORE INTO notifications (customer_id, type, dedupe_key, body) VALUES (?,?,?,?)', [$cid, $type, $key, $fallback])->rowCount() === 0) return;
  $nid = (int)db()->lastInsertId();
  $ids = contacts_of($cid);
  if (!$ids) { $queued++; return; }   // ยังไม่มีใครผูก LINE → ค้างคิว รอบหน้าลองใหม่
  $ok = false;
  foreach ($ids as $to) { [$code] = line_push($to, [fx_reminder($card['kind'], $card)]); if ($code === 200) $ok = true; }
  q('UPDATE notifications SET status=?, sent_at=IF(?,NOW(),NULL) WHERE id=?', [$ok ? 'ส่งแล้ว' : 'ส่งไม่สำเร็จ', $ok ? 1 : 0, $nid]);
  if ($ok) $sent++;
}

$custs = q('SELECT id, name, contact_name FROM customers')->fetchAll();
$items = q('SELECT name, interval_months FROM check_items WHERE active=1')->fetchAll();   // รายการเช็กอื่น ๆ ของสินค้า
foreach ($custs as $c) {
  $who = $c['contact_name'] ?: $c['name'];
  foreach (machines_of((int)$c['id']) as $m) {
    $label = $m['model'] . ' · ' . $m['serial'];
    $d = (int)$m['days_left'];
    foreach ($WARN_DAYS as $t) {            // เลือกขั้นที่แคบที่สุดที่ยังไม่เกิน
      if ($d >= 0 && $d <= $t) {
        notify((int)$c['id'], 'ใกล้หมดประกัน', "w:{$m['id']}:{$m['warranty_end']}:{$t}",
          ['kind' => 'warranty', 'name' => $who, 'label' => $label, 'date' => th_date($m['warranty_end']), 'days' => $d, 'machine_id' => $m['id']],
          "เรียนคุณ{$who} เครื่อง {$label} จะหมดประกันวันที่ " . th_date($m['warranty_end']) . " (อีก {$d} วัน)");
        break;
      }
    }
    foreach ($items as $it) {               // ถึงกำหนดเช็กรายการอื่น เช่น เปลี่ยนไส้กรอง
      $last = q('SELECT MAX(done_on) FROM inspections WHERE machine_id=? AND item_name=?', [$m['id'], $it['name']])->fetchColumn();
      $next = date('Y-m-d', strtotime(($last ?: ($m['install_date'] ?: $m['delivery_date'])) . ' +' . (int)$it['interval_months'] . ' months'));
      $dk = days_until($next);
      if ($dk <= $CHECK_NOTICE) {
        notify((int)$c['id'], 'ถึงกำหนดเช็กรายการ', "k:{$m['id']}:{$it['name']}:{$next}",
          ['kind' => 'check', 'name' => $who, 'label' => $label, 'item' => $it['name'], 'date' => th_date($next), 'days' => $dk, 'machine_id' => $m['id']],
          "เรียนคุณ{$who} เครื่อง {$label} ถึงกำหนด{$it['name']}วันที่ " . th_date($next) . ($dk < 0 ? ' (เลยกำหนดแล้ว)' : ($dk === 0 ? ' (วันนี้)' : " (อีก {$dk} วัน)")));
      }
    }
    if ((int)$m['inspect_days'] <= $INSPECT_NOTICE) {
      notify((int)$c['id'], 'ถึงรอบตรวจเช็ก', "i:{$m['id']}:{$m['next_inspect']}",
        ['kind' => 'inspect', 'name' => $who, 'label' => $label, 'date' => th_date($m['next_inspect']), 'days' => (int)$m['inspect_days'], 'machine_id' => $m['id']],
        "เรียนคุณ{$who} เครื่อง {$label} ถึงรอบตรวจเช็กวันที่ " . th_date($m['next_inspect']));
    }
  }
}

// เตือนนัดหมาย: งานที่มีวันนัด (ยังไม่ปิดงาน) แจ้งล่วงหน้าตาม $APPT_NOTICE — เลื่อนวัน/เวลานัดแล้วจะแจ้งใหม่
$tiers = $APPT_NOTICE; sort($tiers);
$appts = q("SELECT t.code, t.kind, t.customer_id, t.appointment_on, t.appointment_time, t.assignee, m.id AS machine_id, m.model, m.serial, c.name AS cname, c.contact_name
  FROM tickets t JOIN machines m ON m.id = t.machine_id JOIN customers c ON c.id = t.customer_id
  WHERE t.appointment_on IS NOT NULL AND t.appointment_on >= CURDATE() AND t.status NOT IN ('เสร็จสิ้น','ปิดงาน')")->fetchAll();
foreach ($appts as $a) {
  $d = days_until($a['appointment_on']);
  foreach ($tiers as $t) {
    if ($d > $t) continue;
    $who = $a['contact_name'] ?: $a['cname'];
    $what = $a['kind'] === 'inspection' ? 'ตรวจเช็ก' : 'ซ่อม';
    $tm = $a['appointment_time'] ? substr($a['appointment_time'], 0, 5) : '';
    $label = $a['model'] . ' · ' . $a['serial'];
    notify((int)$a['customer_id'], 'เตือนนัดหมาย', "a:{$a['code']}:{$a['appointment_on']}:{$tm}:{$t}",
      ['kind' => 'appointment', 'name' => $who, 'label' => $label, 'what' => $what, 'date' => th_date($a['appointment_on']), 'time' => $tm, 'days' => $d,
       'assignee' => (string)$a['assignee'], 'code' => $a['code'], 'machine_id' => $a['machine_id']],
      "เรียนคุณ{$who} ทีมช่าง CiViO นัดเข้า{$what}เครื่อง {$label} " . ($d === 0 ? 'วันนี้' : 'วันที่ ' . th_date($a['appointment_on']) . " (อีก {$d} วัน)") . ($tm ? " เวลา {$tm} น." : '') . ' หากต้องการเลื่อนนัดกรุณาแจ้งล่วงหน้าครับ');
    break;
  }
}

// ลองส่งซ้ำรายการที่ค้างคิวเพราะยังไม่มีผู้ผูก LINE (ภายใน 30 วัน) — ส่งเป็นข้อความธรรมดา
foreach (q("SELECT id, customer_id, body FROM notifications WHERE status='รอส่ง' AND created_at > NOW() - INTERVAL 30 DAY")->fetchAll() as $n) {
  $ids = contacts_of((int)$n['customer_id']); if (!$ids) continue;
  $ok = false; foreach ($ids as $to) { [$code] = line_push($to, [['type' => 'text', 'text' => $n['body']]]); if ($code === 200) $ok = true; }
  q('UPDATE notifications SET status=?, sent_at=IF(?,NOW(),NULL) WHERE id=?', [$ok ? 'ส่งแล้ว' : 'ส่งไม่สำเร็จ', $ok ? 1 : 0, $n['id']]);
  if ($ok) $sent++;
}
echo date('c') . " sent={$sent} queued={$queued}\n";
