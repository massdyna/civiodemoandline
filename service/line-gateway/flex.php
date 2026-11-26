<?php
/** ตัวสร้าง Flex Message โทนสีเดียวกับเว็บ CiViO (เขียวเข้ม + เหลืองมะนาว) */
const FX_FOREST = '#163b2d', FX_FOREST2 = '#214b39', FX_LIME = '#d9ef79', FX_PAPER = '#fffefa',
      FX_INK = '#1f2d25', FX_MUTED = '#6c786f', FX_OK = '#2f7d4f', FX_WARN = '#b9791a',
      FX_BAD = '#b3412f', FX_INFO = '#2b6a9e', FX_LINE = '#e3e3d6';

function fx_t($text, array $o = []): array {
  return array_merge(['type' => 'text', 'text' => (string)$text, 'wrap' => true, 'color' => FX_INK, 'size' => 'sm'], $o);
}
function fx_box(array $contents, array $o = []): array {
  return array_merge(['type' => 'box', 'layout' => 'vertical', 'contents' => $contents], $o);
}
function fx_sep(): array { return ['type' => 'separator', 'color' => FX_LINE, 'margin' => 'md']; }
function fx_badge(string $text, string $color): array {
  return fx_box([fx_box([fx_t($text, ['color' => '#ffffff', 'size' => 'xs', 'weight' => 'bold', 'align' => 'center', 'wrap' => false])], [
    'backgroundColor' => $color, 'cornerRadius' => '20px', 'paddingTop' => '3px', 'paddingBottom' => '3px',
    'paddingStart' => '12px', 'paddingEnd' => '12px', 'flex' => 0])], ['layout' => 'horizontal']);
}
function fx_row(string $k, string $v): array {
  return fx_box([fx_t($k, ['color' => FX_MUTED, 'size' => 'xs', 'flex' => 3]), fx_t($v, ['flex' => 5, 'size' => 'sm'])], ['layout' => 'horizontal', 'spacing' => 'sm']);
}
function pb(string $label, string $data, ?string $display = null): array {
  return ['type' => 'postback', 'label' => mb_substr($label, 0, 20), 'data' => $data, 'displayText' => $display ?? $label];
}
function uri(string $label, string $u): array { return ['type' => 'uri', 'label' => mb_substr($label, 0, 20), 'uri' => $u]; }
function fx_btn(array $action, bool $primary = true): array {
  return $primary
    ? ['type' => 'button', 'style' => 'primary', 'color' => FX_FOREST, 'height' => 'sm', 'action' => $action]
    : ['type' => 'button', 'style' => 'secondary', 'color' => FX_LIME, 'height' => 'sm', 'action' => $action];
}

/** กรอบการ์ดมาตรฐาน: หัวเขียวเข้ม ตัวหนังสือเหลืองมะนาว เนื้อหาพื้นขาวนวล */
function fx_bubble(string $title, string $eyebrow, array $body, array $footer = [], string $size = 'kilo'): array {
  $b = ['type' => 'bubble', 'size' => $size,
    'header' => fx_box([
      fx_t($eyebrow, ['color' => FX_LIME, 'size' => 'xxs', 'weight' => 'bold']),
      fx_t($title, ['color' => '#ffffff', 'size' => 'lg', 'weight' => 'bold', 'margin' => 'xs']),
    ], ['backgroundColor' => FX_FOREST, 'paddingAll' => '16px']),
    'body' => fx_box($body, ['spacing' => 'md', 'paddingAll' => '16px']),
    'styles' => ['body' => ['backgroundColor' => FX_PAPER], 'footer' => ['backgroundColor' => FX_PAPER]]];
  if ($footer) $b['footer'] = fx_box($footer, ['spacing' => 'sm', 'paddingAll' => '12px']);
  return $b;
}
function fx_msg(string $alt, array $contents, array $quick = []): array {
  $m = ['type' => 'flex', 'altText' => mb_substr($alt, 0, 380), 'contents' => $contents];
  if ($quick) $m['quickReply'] = ['items' => array_map(fn($a) => ['type' => 'action', 'action' => $a], array_slice($quick, 0, 13))];
  return $m;
}
function fx_carousel(array $bubbles): array { return ['type' => 'carousel', 'contents' => array_slice($bubbles, 0, 12)]; }
function txt(string $t, array $quick = []): array {
  $m = ['type' => 'text', 'text' => $t];
  if ($quick) $m['quickReply'] = ['items' => array_map(fn($a) => ['type' => 'action', 'action' => $a], array_slice($quick, 0, 13))];
  return $m;
}

/* ---------- เมนูหลัก ---------- */
function fx_menu_grid(): array {
  $pairs = [
    [['🛡️ เช็กประกัน', 'act=warranty'], ['🔧 แจ้งซ่อม', 'act=repair']],
    [['📋 ติดตามงาน', 'act=status'], ['📅 นัดตรวจเช็ก', 'act=inspect']],
    [['🌱 สินค้า/บริการ', 'act=products'], ['📞 ติดต่อเรา', 'act=contact']],
  ];
  $rows = [];
  foreach ($pairs as $p) {
    $rows[] = fx_box([fx_btn(pb($p[0][0], $p[0][1]), false), fx_btn(pb($p[1][0], $p[1][1]), false)], ['layout' => 'horizontal', 'spacing' => 'sm']);
  }
  return $rows;
}
function fx_welcome(?string $name, bool $bound, string $org = ''): array {
  $hi = $name ? "สวัสดีครับคุณ{$name}" : 'สวัสดีครับ';
  $body = [fx_t($hi, ['weight' => 'bold', 'size' => 'md'])];
  if ($bound) {
    $body[] = fx_t("เชื่อมกับบัญชี {$org} แล้ว ดูประกัน แจ้งซ่อม และติดตามงานได้จากเมนูด้านล่างเลยครับ", ['color' => FX_MUTED]);
  } else {
    $body[] = fx_t('ยินดีต้อนรับสู่ CiViO Thailand ผู้ช่วยดูแลเครื่องกำจัดเศษอาหารของคุณ', ['color' => FX_MUTED]);
    $body[] = fx_box([fx_t('ลูกค้าที่ซื้อเครื่องแล้ว พิมพ์รหัสผูกบัญชีที่ทีมงานให้ เช่น', ['size' => 'xs', 'color' => FX_MUTED]),
      fx_t('ผูกบัญชี ABCD2345', ['weight' => 'bold', 'color' => FX_FOREST, 'margin' => 'xs'])],
      ['backgroundColor' => '#f1f5df', 'cornerRadius' => '10px', 'paddingAll' => '10px']);
  }
  $body[] = fx_sep();
  return fx_msg('เมนู CiViO Service', fx_bubble('CiViO Service', 'ดูแลหลังการขาย', array_merge($body, fx_menu_grid()), [], 'mega'));
}

/* ---------- การ์ดเครื่อง/ประกัน ---------- */
function fx_machine_card(array $m): array {
  $d = (int)$m['days_left'];
  [$label, $color] = $d < 0 ? ['หมดประกันแล้ว', FX_BAD] : ($d <= 90 ? ['ใกล้หมดประกัน', FX_WARN] : ['อยู่ในประกัน', FX_OK]);
  $big = $d < 0 ? 'หมดแล้ว ' . abs($d) . ' วัน' : "เหลือ {$d} วัน";
  $id = (int)$m['id'];
  $id2 = (int)$m['inspect_days'];
  $ins = $id2 < 0 ? 'เลยกำหนด ' . abs($id2) . ' วัน' : ($id2 <= 14 ? "อีก {$id2} วัน" : th_date($m['next_inspect']));
  $body = [
    fx_badge($label, $color),
    fx_t($big, ['size' => 'xl', 'weight' => 'bold', 'color' => $color, 'margin' => 'sm']),
    fx_sep(),
    fx_row('หมดประกัน', th_date($m['warranty_end'])),
    fx_row('ตรวจเช็กถัดไป', $ins),
    fx_row('ติดตั้งที่', (string)($m['location'] ?: '-')),
  ];
  return fx_bubble((string)$m['model'], 'ซีเรียล ' . $m['serial'], $body,
    [fx_btn(pb('แจ้งซ่อมเครื่องนี้', 'act=repair&m=' . $id)), fx_btn(pb('ขอตรวจเช็ก', 'act=inspect&m=' . $id), false)]);
}

/* ---------- การ์ดงานซ่อม + แถบความคืบหน้า ---------- */
function fx_progress(string $status): array {
  $steps = ['รับเรื่อง', 'นัดหมาย', 'ดำเนินการ', 'เสร็จสิ้น'];
  $idx = ['ใหม่' => 0, 'นัดหมายแล้ว' => 1, 'กำลังดำเนินการ' => 2, 'รออะไหล่' => 2, 'เสร็จสิ้น' => 3, 'ปิดงาน' => 3][$status] ?? 0;
  $bars = $labels = [];
  foreach ($steps as $i => $s) {
    $bars[] = fx_box([], ['height' => '6px', 'cornerRadius' => '3px', 'backgroundColor' => $i <= $idx ? FX_FOREST : FX_LINE, 'flex' => 1]);
    $labels[] = fx_t($s, ['size' => 'xxs', 'align' => 'center', 'flex' => 1, 'wrap' => false, 'color' => $i <= $idx ? FX_FOREST : FX_MUTED, 'weight' => $i == $idx ? 'bold' : 'regular']);
  }
  return fx_box([fx_box($bars, ['layout' => 'horizontal', 'spacing' => 'xs']), fx_box($labels, ['layout' => 'horizontal', 'spacing' => 'xs', 'margin' => 'sm'])]);
}
function fx_status_badge(string $s): array {
  $c = in_array($s, ['เสร็จสิ้น', 'ปิดงาน']) ? FX_OK : ($s === 'รออะไหล่' ? FX_WARN : ($s === 'ใหม่' ? FX_BAD : FX_INFO));
  return fx_badge($s, $c);
}
function fx_ticket_card(array $t, bool $withRate = false): array {
  $body = [
    fx_status_badge($t['status']),
    fx_progress($t['status']),
    fx_sep(),
    fx_row('เครื่อง', ($t['model'] ?? '-') . ' · ' . ($t['serial'] ?? '-')),
    fx_row('อาการ', (string)$t['symptom']),
    fx_row('แจ้งเมื่อ', th_date($t['created_at'])),
  ];
  if (!empty($t['appointment_on'])) $body[] = fx_row('นัดหมาย', th_date($t['appointment_on']));
  if (!empty($t['assignee'])) $body[] = fx_row('ผู้รับผิดชอบ', (string)$t['assignee']);
  if (!empty($t['note'])) $body[] = fx_row('หมายเหตุ', (string)$t['note']);
  $footer = [];
  if ($withRate) $footer[] = fx_btn(pb('ให้คะแนนบริการ', 'act=ratemenu&t=' . $t['code']), false);
  return fx_bubble('งาน ' . $t['code'], 'ติดตามงานซ่อม', $body, $footer);
}

/* ---------- ยืนยันก่อนแจ้งซ่อม ---------- */
function fx_confirm(string $machine, string $symptom, string $desc, string $priority): array {
  $body = [fx_row('เครื่อง', $machine), fx_row('อาการ', $symptom), fx_row('รายละเอียด', $desc !== '' ? $desc : '-'), fx_row('ความเร่งด่วน', $priority)];
  return fx_msg('ยืนยันการแจ้งซ่อม', fx_bubble('ตรวจสอบก่อนส่ง', 'ยืนยันแจ้งซ่อม', $body,
    [fx_btn(pb('ยืนยันส่งเรื่อง', 'act=confirm', 'ยืนยัน')), fx_btn(pb('ยกเลิก', 'act=cancel'), false)]));
}

/* ---------- ติดต่อ / สินค้า ---------- */
function fx_contact(): array {
  $tel = preg_replace('/\D/', '', cfg('COMPANY_PHONE', '0863517534'));
  $site = rtrim(cfg('SITE_URL', 'https://civio.co.th'), '/');
  $body = [fx_t('ทีมบริการลูกค้า CiViO พร้อมช่วยเหลือ', ['weight' => 'bold']),
    fx_row('โทร', cfg('COMPANY_PHONE', '086-351-7534')), fx_row('เวลาทำการ', 'จันทร์–เสาร์ 08:30–17:30'), fx_row('เว็บไซต์', preg_replace('#^https?://#', '', $site))];
  return fx_msg('ติดต่อ CiViO', fx_bubble('ติดต่อเรา', 'CiViO Thailand', $body,
    [fx_btn(uri('โทรหาทีมงาน', 'tel:' . $tel)), fx_btn(uri('เปิดเว็บไซต์', $site), false)]));
}
function fx_products(): array {
  $site = rtrim(cfg('SITE_URL', 'https://civio.co.th'), '/');
  $items = [
    ['เครื่องกำจัดเศษอาหาร CiViO', 'รุ่น CV15–CV1000 เปลี่ยนเศษอาหารเป็นวัสดุปรับปรุงดินในไม่กี่ชั่วโมง', 'product-civio.html'],
    ['KAIBIN · NovaBinQ', 'ถังหมักและระบบจัดการขยะอินทรีย์สำหรับครัวเรือนและชุมชน', 'product-novabinq.html'],
    ['ผักปลอดสารจากฟาร์ม CiViO', 'ผักสดจากระบบเกษตรหมุนเวียน', 'product-vegetables.html'],
    ['คอร์สอบรม', 'คัดแยกขยะและปลูกผักอินทรีย์', 'product-course.html'],
  ];
  $b = array_map(fn($i) => fx_bubble($i[0], 'สินค้า/บริการ', [fx_t($i[1])], [fx_btn(uri('ดูรายละเอียด', $site . '/' . $i[2]))]), $items);
  return fx_msg('สินค้าและบริการ CiViO', fx_carousel($b));
}

/* ---------- การ์ดแจ้งเตือน (ใช้ทั้ง cron และ send.php) ---------- */
function fx_reminder(string $kind, array $d): array {
  $who = trim((string)($d['name'] ?? '')) ?: 'ลูกค้า';
  $days = (int)($d['days'] ?? 0);
  $mq = isset($d['machine_id']) ? '&m=' . (int)$d['machine_id'] : '';
  $extra = [];
  if ($kind === 'warranty') {
    $title = 'ใกล้หมดประกัน'; $eyebrow = 'แจ้งเตือนประกัน'; $color = $days <= 7 ? FX_BAD : FX_WARN;
    $big = $days < 0 ? 'หมดประกันแล้ว' : "อีก {$days} วัน";
    $note = 'สนใจต่อประกัน/สัญญาบริการ หรือขอตรวจเช็กก่อนหมดประกัน กดปุ่มด้านล่างได้เลยครับ';
    $btn = fx_btn(pb('ขอตรวจเช็กก่อนหมดประกัน', 'act=inspect' . $mq));
    $k = 'หมดประกัน'; $date = (string)($d['date'] ?? '-');
  } elseif ($kind === 'appointment') {   // เตือนล่วงหน้าก่อนทีมช่างนัดเข้าพบลูกค้า
    $title = 'เตือนนัดหมาย'; $eyebrow = 'ทีมช่างนัดเข้าพบ'; $color = $days <= 1 ? FX_WARN : FX_INFO;
    $big = $days <= 0 ? 'วันนี้' : ($days === 1 ? 'พรุ่งนี้' : "อีก {$days} วัน");
    $note = 'ขอให้เตรียมพื้นที่ให้ช่างเข้าถึงเครื่องได้สะดวก หากต้องการเลื่อนนัด โทรแจ้งทีมงานล่วงหน้าได้เลยครับ';
    $btn = fx_btn(pb('ดูสถานะงาน', 'act=status'));
    $k = 'วันนัด'; $date = (string)($d['date'] ?? '-') . (!empty($d['time']) ? ' เวลา ' . $d['time'] . ' น.' : '');
    $extra[] = fx_row('งาน', (string)($d['what'] ?? 'ตรวจเช็ก'));
    if (!empty($d['assignee'])) $extra[] = fx_row('ผู้รับผิดชอบ', (string)$d['assignee']);
    if (!empty($d['code'])) $extra[] = fx_row('เลขที่งาน', (string)$d['code']);
  } elseif ($kind === 'check') {          // ถึงกำหนดเช็กรายการอื่นของสินค้า (เช่น เปลี่ยนไส้กรอง)
    $title = (string)($d['item'] ?? 'ถึงกำหนดเช็ก'); $eyebrow = 'ถึงกำหนดเช็ก'; $color = $days < 0 ? FX_BAD : ($days <= 3 ? FX_WARN : FX_INFO);
    $big = $days < 0 ? 'เลยกำหนด ' . abs($days) . ' วัน' : ($days === 0 ? 'ครบกำหนดวันนี้' : "อีก {$days} วัน");
    $note = 'เช็กตามกำหนดช่วยให้เครื่องทำงานเต็มประสิทธิภาพ กดนัดหมายได้เลยครับ';
    $btn = fx_btn(pb('นัดเช็กรายการนี้', 'act=inspect' . $mq));
    $k = 'กำหนด'; $date = (string)($d['date'] ?? '-');
  } else {
    $title = 'ถึงรอบตรวจเช็ก'; $eyebrow = 'แจ้งเตือนตรวจเช็ก'; $color = $days < 0 ? FX_BAD : FX_INFO;
    $big = $days < 0 ? 'เลยกำหนด ' . abs($days) . ' วัน' : "อีก {$days} วัน";
    $note = 'ตรวจเช็กตามรอบช่วยให้เครื่องทำงานเต็มประสิทธิภาพและยืดอายุการใช้งาน กดนัดหมายได้เลยครับ';
    $btn = fx_btn(pb('นัดตรวจเช็ก', 'act=inspect' . $mq));
    $k = 'ครบรอบ'; $date = (string)($d['date'] ?? '-');
  }
  $body = array_merge([fx_t("เรียนคุณ{$who}", ['weight' => 'bold']), fx_t((string)($d['label'] ?? '-'), ['color' => FX_MUTED, 'size' => 'xs']),
    fx_t($big, ['size' => 'xxl', 'weight' => 'bold', 'color' => $color, 'margin' => 'sm']),
    fx_row($k, $date)], $extra, [fx_sep(), fx_t($note, ['size' => 'xs', 'color' => FX_MUTED])]);
  return fx_msg($title . ' · ' . ($d['label'] ?? ''), fx_bubble($title, $eyebrow, $body, [$btn, fx_btn(uri('โทรหาทีมงาน', 'tel:' . preg_replace('/\D/', '', cfg('COMPANY_PHONE', '0863517534'))), false)]));
}
/** แจ้งอัปเดตสถานะงานซ่อม d: code, model, serial, symptom, status, created_at, appointment_on?, assignee?, note? */
function fx_ticket_update(array $d): array {
  $d += ['created_at' => date('Y-m-d')];
  return fx_msg('งาน ' . ($d['code'] ?? '') . ' สถานะ: ' . ($d['status'] ?? ''), fx_ticket_card($d, in_array($d['status'] ?? '', ['เสร็จสิ้น', 'ปิดงาน'])));
}
