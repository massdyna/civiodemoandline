<?php
/**
 * สร้าง Rich Menu (ปุ่ม 6 ช่องใต้แชต) แล้วตั้งเป็นเมนูเริ่มต้นของทุกคน — รันครั้งเดียว
 *   php setup-richmenu.php        (ต้องมีไฟล์ richmenu/richmenu.png 2500x1686)
 */
require_once __DIR__ . '/lib.php';
if (PHP_SAPI !== 'cli') { http_response_code(403); exit; }
$img = __DIR__ . '/richmenu/richmenu.png'; if (!is_file($img)) exit("ไม่พบ richmenu/richmenu.png\n");
$w = 833; $h = 843; $areas = [];
$acts = [['🛡️ เช็กประกัน', 'act=warranty'], ['🔧 แจ้งซ่อม', 'act=repair'], ['📋 ติดตามงาน', 'act=status'], ['📅 นัดตรวจเช็ก', 'act=inspect'], ['🌱 สินค้า/บริการ', 'act=products'], ['📞 ติดต่อเรา', 'act=contact']];
foreach ($acts as $i => $a) {
  $areas[] = ['bounds' => ['x' => ($i % 3) * $w, 'y' => intdiv($i, 3) * $h, 'width' => $i % 3 === 2 ? 2500 - 2 * $w : $w, 'height' => $h],
              'action' => ['type' => 'postback', 'data' => $a[1], 'displayText' => $a[0]]];
}
[$code, $res] = line_call('/v2/bot/richmenu', ['size' => ['width' => 2500, 'height' => 1686], 'selected' => true, 'name' => 'CiViO Service', 'chatBarText' => 'เมนู CiViO', 'areas' => $areas]);
if ($code !== 200) exit("สร้างเมนูไม่สำเร็จ ({$code}): " . json_encode($res, JSON_UNESCAPED_UNICODE) . "\n");
$id = $res['richMenuId'];
$ch = curl_init("https://api-data.line.me/v2/bot/richmenu/{$id}/content");
curl_setopt_array($ch, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_POSTFIELDS => file_get_contents($img),
  CURLOPT_HTTPHEADER => ['Content-Type: image/png', 'Authorization: Bearer ' . cfg('LINE_CHANNEL_TOKEN')]]);
curl_exec($ch); $c2 = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);
if ($c2 !== 200) exit("อัปโหลดรูปไม่สำเร็จ ({$c2})\n");
[$c3] = line_call("/v2/bot/user/all/richmenu/{$id}");
echo $c3 === 200 ? "ตั้ง Rich Menu เรียบร้อย: {$id}\n" : "ตั้งเป็นเมนูเริ่มต้นไม่สำเร็จ ({$c3})\n";
