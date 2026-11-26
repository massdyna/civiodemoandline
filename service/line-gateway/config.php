<?php
/** อ่านค่าตั้งจากตัวแปรสภาพแวดล้อม หรือไฟล์ config.local.php (คัดลอกจาก config.sample.php) */
date_default_timezone_set('Asia/Bangkok');
function cfg(string $k, string $d = ''): string {
  static $c = null;
  if ($c === null) { $f = __DIR__ . '/config.local.php'; $c = is_file($f) ? (array)(require $f) : []; }
  $e = getenv($k);
  return ($e !== false && $e !== '') ? $e : (string)($c[$k] ?? $d);
}
