<?php
// ─── JitHome Setup Script ──────────────────────────────────────
// Run once to create tables and import sample data
// Delete or rename this file after setup is complete

declare(strict_types=1);
set_time_limit(120);
header('Content-Type: text/html; charset=utf-8');

$errors = [];
$steps  = [];

// ── Config ─────────────────────────────────────────────────────
$host    = $_POST['host']    ?? 'localhost';
$dbname  = $_POST['dbname']  ?? 'jithome';
$user    = $_POST['user']    ?? 'root';
$pass    = $_POST['pass']    ?? '';

// ── Raw data ────────────────────────────────────────────────────
$RAW = [
    [45905,"สีเหลือง","นายอุทัย แสงงาม","หมู่ 5","3 สัปดาห์",""],
    [45792,"สีแดง","นายอุุดร ไชยพันโท","หมู่ 9","4สัปดาห์",""],
    [45819,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","4สัปดาห์",""],
    [45817,"สีเขียว","นางไสว ไชยพันโท","หมู่ 9","4สัปดาห์","ไม่มา"],
    [45798,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","4สัปดาห์",""],
    [45810,"สีแดง","นายอุุดร ไชยพันโท","หมู่ 9","4สัปดาห์",""],
    [45821,"สีเขียว","นายนันทโก คุณพาที","หมู่ 1","4สัปดาห์",""],
    [45761,"สีแดง","นายศักดา เรืองสา","หมู่ 8","3สัปดาห์","ไม่มา"],
    [45802,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","4สัปดาห์","มา"],
    [45626,"สีเหลือง","นายนันทวุฒิ จันทชารี","หมู่ 1","4สัปดาห์","ไม่ยาฉีด/cosult"],
    [45834,"สีเขียว","นายอรรถพงษ์ วงษายะ","หมู่ 1","4สัปดาห์",""],
    [45804,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","4สัปดาห์",""],
    [45798,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์","มา"],
    [45804,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","4สัปดาห์",""],
    [45811,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","4สัปดาห์",""],
    [45802,"สีเหลือง","นางโกศรี สีดาแก้ว","หมู่ 5","4สัปดาห์","มา"],
    [45788,"สีเหลือง","นายสิทธิโชค สายใจ","หมู่ 5","4สัปดาห์","ไม่มา"],
    [45805,"สีเหลือง","นายอาทิตย์ วงศ์ชาลี","หมู่ 7","4สัปดาห์",""],
    [45784,"สีแดง","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","4สัปดาห์","ไม่มา"],
    [45823,"สีเหลือง","นายบัวพา สุวรรณรมย์","หมู่ 4","4สัปดาห์",""],
    [45829,"สีเขียว","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์","มา"],
    [45831,"สีแดง","นางสาวสุดาพร แก้วงาม","หมู่ 1","4สัปดาห์",""],
    [45812,"สีแดง","นายอุุดร ไชยพันโท","หมู่ 9",null,"ฉีดยา Invega 100 mg inj."],
    [45833,"สีเหลือง","นางโกศรี สีดาแก้ว","หมู่ 5","4สัปดาห์",""],
    [45834,"สีเหลือง","นายสมเด็จ ไชยพันโท","หมู่ 7","4สัปดาห์",""],
    [45833,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","4สัปดาห์",""],
    [45835,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","4สัปดาห์",""],
    [45820,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","2สัปดาห์","มียา DEPO-A ฉีด ทุก 3 เดือน"],
    [45837,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","4สัปดาห์",""],
    [45841,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","4สัปดาห์",""],
    [45836,"สีเหลือง","นายวิชาญ สีดาแก้ว","หมู่ 5","4สัปดาห์",""],
    [45833,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3สัปดาห์","เผาเสื้อผ้า มียา DEPO-A ฉีด ทุก 3 เดือน"],
    [45818,"สีแดง","นายศักดา เรืองสา","หมู่ 8","4สัปดาห์",""],
    [45842,"สีแดง","นายอุุดร ไชยพันโท","หมู่ 9","4สัปดาห์","ฉีดยา Invega 100 mg inj."],
    [45842,"สีแดง","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","4สัปดาห์","ฉีดยา 4 มิ.ย 68"],
    [45842,"สีเหลือง","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 3","4สัปดาห์","ฉีดยา 4 มิ.ย 68"],
    [45846,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","4สัปดาห์","มียา DEPO-A ฉีด ทุก 3 เดือน"],
    [45848,"สีเหลือง","นายศักดา เรืองสา","หมู่ 8","4สัปดาห์",""],
    [45866,"สีเขียว","นายอาทิตย์ วงศ์ชาลี","หมู่ 7","4สัปดาห์",""],
    [45884,"สีแดง","นายอุุดร ไชยพันโท","หมู่ 9","3 เดือน","มียา DEPO-A ฉีด ทุก 3 เดือน"],
    [45851,"สีเหลือง","นายนันทโก คุณพาที","หมู่ 1","4สัปดาห์",""],
    [45853,"สีเหลือง","นายบัวพา สุวรรณรมย์","หมู่ 4","4สัปดาห์",""],
    [45839,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","2สัปดาห์",""],
    [45859,"สีเขียว","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์",""],
    [45859,"สีเหลือง","นางสาวสุดาพร แก้วงาม","หมู่ 1","4สัปดาห์",""],
    [45863,"สีเหลือง","นางสาวโกศรี สีดาแก้ว","หมู่ 5","4สัปดาห์",""],
    [45863,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","4สัปดาห์",""],
    [45864,"สีเหลือง","นายอรรถพงษ์ วงษายะ","หมู่ 1","4สัปดาห์",""],
    [45865,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","4สัปดาห์",""],
    [45866,"สีเหลือง","นายอาทิตย์ วงศ์ชาลี","หมู่ 7","4สัปดาห์",""],
    [45866,"สีเหลือง","นายวิชาญ สีดาแก้ว","หมู่ 5","4สัปดาห์",""],
    [45898,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","4สัปดาห์",""],
    [45873,"สีเหลือง","นายอุุดร ไชยพันโท","หมู่ 9","4สัปดาห์","อาการคุ้มคลั่ง ตำรวจนำส่ง รพ.โพธิ์ไทร"],
    [45863,"สีแดง","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","4สัปดาห์",""],
    [45872,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","4สัปดาห์",""],
    [45873,"สีเหลือง","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 3","4สัปดาห์",""],
    [45874,"สีเหลือง","นายศักดา เรืองสา","หมู่ 8","4สัปดาห์",""],
    [45877,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","4สัปดาห์","มียา DEPO-A ฉีด 8 ก.ค.68 ทุก 3 เดือน"],
    [45882,"สีเขียว","นายนันทโก คุณพาที","หมู่ 9","4สัปดาห์",""],
    [45884,"สีเขียว","นายบัวพา สุวรรณรมย์","หมู่ 4","4สัปดาห์",""],
    [45885,"สีเขียว","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์",""],
    [45892,"สีเหลือง","นางสาวสุดาพร แก้วงาม","หมู่ 1","4สัปดาห์",""],
    [45894,"สีเหลือง","นางสาวโกศรี สีดาแก้ว","หมู่ 5","4สัปดาห์",""],
    [45894,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","4สัปดาห์",""],
    [45895,"สีเหลือง","นายอรรถพงษ์ วงษายะ","หมู่ 1","4สัปดาห์",""],
    [45898,"สีเขียว","นายอาทิตย์ วงศ์ชาลี","หมู่ 7","4สัปดาห์",""],
    [45901,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","4สัปดาห์",""],
    [45903,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","4สัปดาห์",""],
    [45904,"สีเขียว","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 2","4สัปดาห์",""],
    [45913,"สีเขียว","นายนันทโก คุณพาที","หมู่ 1","4สัปดาห์",""],
    [45883,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3สัปดาห์","มา จาก รพ.พระศรี"],
    [45894,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","4สัปดาห์",""],
    [45913,"สีแดง","นายศักดา เรืองสา","หมู่ 8","4สัปดาห์",""],
    [45908,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","4สัปดาห์",""],
    [45883,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","3สัปดาห์","DMPA"],
    [45904,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","3สัปดาห์",""],
    [45904,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3สัปดาห์",""],
    [45915,"สีเหลือง","นายบัวพา สุวรรณรมย์","หมู่ 4","4สัปดาห์",""],
    [45913,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์",""],
    [45926,"สีเหลือง","นายอรรถพงษ์ วงษายะ","หมู่ 1","4สัปดาห์",""],
    [45928,"สีเหลือง","นายวิชาญ สีดาแก้ว","หมู่ 5","4สัปดาห์",""],
    [45928,"สีเหลือง","นายอาทิตย์ วงศ์ชาลี","หมู่ 7","4สัปดาห์",""],
    [45930,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","4สัปดาห์",""],
    [45931,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","4สัปดาห์",""],
    [45903,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","4สัปดาห์",""],
    [45933,"สีแดง","นายศักดา เรืองสา","หมู่ 8","4สัปดาห์",""],
    [45933,"สีเหลือง","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 5","4สัปดาห์",""],
    [45905,"สีเขียว","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 2","4สัปดาห์",""],
    [45929,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3 สัปดาห์",""],
    [45922,"สีเหลือง","นายสิทธิโชค สายใจ","หมู่ 5","3สัปดาห์",""],
    [45941,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์",""],
    [45944,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","1 เดือน",""],
    [45945,"สีเหลือง","นายบัวพา สุวรรณรมย์","หมู่ 4","1 เดือน",""],
    [45955,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","1 เดือน",""],
    [45955,"สีเหลือง","นางโกศรี สีดาแก้ว","หมู่ 2","1 เดือน",""],
    [45955,"สีแดง","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","1 เดือน",""],
    [45956,"สีเหลือง","นายอรรถพงษ์ วงษายะ","หมู่ 1","1 เดือน",""],
    [45958,"สีเหลือง","นายอาทิตย์ วงศ์ชาลี","หมู่ 7","1 เดือน",""],
    [45959,"สีเหลือง","นายวิชาญ สีดาแก้ว","หมู่ 5","1 เดือน",""],
    [45960,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","1 เดือน",""],
    [45951,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","3 สัปดาห์",""],
    [45951,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3 สัปดาห์",""],
    [45962,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","1 เดือน",""],
    [45964,"สีเขียว","นายแพว กุลสิริ","หมู่ 4","1 เดือน",""],
    [45964,"สีเหลือง","นางเฟื้องฟ้า อัปกาญจน์","หมู่ 6","1 เดือน",""],
    [45964,"สีเหลือง","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 2","1 เดือน",""],
    [45964,"สีเหลือง","นายศักดา เรืองสา","หมู่ 8","4สัปดาห์",""],
    [45971,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์",""],
    [45974,"สีเหลือง","นายนันทโก คุณพาที","หมู่ 1","1 เดือน",""],
    [45980,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","1 เดือน",""],
    [45984,"สีเหลือง","นางสาวสุดาพร แก้วงาม","หมู่ 1","1 เดือน",""],
    [45975,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","3สัปดาห์",""],
    [45975,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3สัปดาห์",""],
    [45986,"สีเหลือง","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","1 เดือน",""],
    [45991,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","1 เดือน",""],
    [45989,"สีเหลือง","นายอาทิตย์ วงศ์ชาลี","หมู่ 7","1 เดือน",""],
    [45987,"สีเหลือง","นายอรรถพงษ์ วงษายะ","หมู่ 1","1 เดือน",""],
    [45990,"สีเหลือง","นายวิชาญ สีดาแก้ว","หมู่ 5","1 เดือน",""],
    [45992,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","1 เดือน",""],
    [45994,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","1 เดือน",""],
    [45994,"สีเหลือง","นางเฟื้องฟ้า อัปกาญจน์","หมู่ 6","1 เดือน",""],
    [45994,"สีเขียว","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 2","1 เดือน",""],
    [45999,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","1 เดือน",""],
    [45996,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3 สัปดาห์",""],
    [45996,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","3 สัปดาห์",""],
    [45996,"สีแดง","นายศักดา เรืองสา","หมู่ 8","4สัปดาห์",""],
    [46004,"สีเหลือง","นายนันทโก คุณพาที","หมู่ 1","1 เดือน",""],
    [46010,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","1 เดือน",""],
    [46014,"สีเหลือง","นางสาวสุดาพร แก้วงาม","หมู่ 1","1 เดือน",""],
    [46016,"สีเขียว","นางโกศรี สีดาแก้ว","หมู่ 2","1 เดือน",""],
    [46015,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","1 เดือน",""],
    [46017,"สีเหลือง","นายอรรถพงษ์ วงษายะ","หมู่ 1","1 เดือน",""],
    [46021,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","1 เดือน",""],
    [46025,"สีเหลือง","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 3","1 เดือน",""],
    [46025,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","1 เดือน",""],
    [46030,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","1 เดือน",""],
    [46018,"สีแดง","นายอุทัย แสงงาม","หมู่ 5","3 สัปดาห์",""],
    [46018,"สีแดง","นายสิทธิโชค สายใจ","หมู่ 5","3 สัปดาห์",""],
    [46023,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","1 เดือน",""],
    [46035,"สีเหลือง","นายนันทโก คุณพาที","หมู่ 1","1 เดือน",""],
    [46045,"สีแดง","นายสุรชัย พิมพ์สอน","หมู่ 6","1 เดือน",""],
    [46047,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","1 เดือน",""],
    [46055,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","4สัปดาห์",""],
    [46057,"สีเหลือง","นายสมเด็จ ไชยพันโท","หมู่ 7","4สัปดาห์",""],
    [46081,"สีเขียว","นายวิชาญ สีดาแก้ว","หมู่ 5","1 เดือน",""],
    [46078,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","1 เดือน",""],
    [46078,"สีเหลือง","นางสาวโกศรี สีดาแก้ว","หมู่ 2","1 เดือน",""],
    [46078,"สีเหลือง","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","1 เดือน",""],
    [46081,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","1 เดือน",""],
    [46080,"สีเหลือง","นายอรรถพงษ์ วงษายะ","หมู่ 1","1 เดือน",""],
    [46082,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","1 เดือน",""],
    [46084,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","1 เดือน",""],
    [46084,"สีเหลือง","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 3","1 เดือน",""],
    [46083,"สีเขียว","นายโพธิ์ไทร สิงหาปันยา","หมู่ 1","1 เดือน","FLUPENTIXOL INJ. 40MG/2ML"],
    [46106,"สีเขียว","นางสาวโกศรี สีดาแก้ว","หมู่ 2","1 เดือน",""],
    [46106,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","1 เดือน",""],
    [46104,"สีเขียว","นางสาวสุดาพร แก้วงาม","หมู่ 1","1 เดือน",""],
    [46106,"สีเขียว","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","1 เดือน",""],
    [46096,"สีเขียว","นายบัวพา สุวรรณรมย์","หมู่ 4","1 เดือน",""],
    [46090,"สีเขียว","นายวิชาญ สีดาแก้ว","หมู่ 5","1 เดือน",""],
    [46106,"สีเขียว","พระนันทโก คุณพาที","หมู่ 1","1 เดือน",""],
    [46115,"สีเขียว","พระนันทรักษ์ ศรีวงศ์ษา","หมู่ 2","1 เดือน",""],
    [46115,"สีเขียว","นายคำหล้า ขันตะคุต","หมู่ 1","1 เดือน",""],
    [46115,"สีเขียว","นายอรรถพงษ์ วงษายะ","หมู่ 1","1 เดือน",""],
    [46115,"สีเขียว","นายก้องเกียรติ อู่แก้ว","หมู่ 3","1 เดือน",""],
    [46084,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","1 เดือน",""],
    [46109,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","1 เดือน",""],
    [46120,"สีเหลือง","นายวิชาญ สีดาแก้ว","หมู่ 5","1 เดือน",""],
    [46131,"สีเหลือง","นายสุรชัย พิมพ์สอน","หมู่ 6","1 เดือน",""],
    [46132,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์",""],
    [46137,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","1 เดือน",""],
    [46137,"สีเหลือง","นางโกศรี สีดาแก้ว","หมู่ 5","1 เดือน",""],
    [46137,"สีเหลือง","พระนันทโก คุณพาที","หมู่ 1","1 เดือน",""],
    [46137,"สีเขียว","นายสุวัจน์ ศรีประเสริฐ","หมู่ 8","1 เดือน",""],
    [46137,"สีเขียว","นายศักดา เรืองสา","หมู่ 8","1 เดือน",""],
    [46138,"สีแดง","นายอุดร ไชยพันโท","หมู่ 9","1 เดือน",""],
    [46140,"สีเหลือง","นายสีทา จันทะชารี","หมู่ 4","1 เดือน",""],
    [46142,"สีเหลือง","นายโพธิ์ไทร สิงหาปันยา","หมู่ 1","4สัปดาห์",""],
    [46144,"สีเหลือง","นายคำหล้า ขันตะคุต","หมู่ 1","1 เดือน",""],
    [46145,"สีเหลือง","นายแพว กุลสิริ","หมู่ 4","1 เดือน",""],
    [46150,"สีเหลือง","นายวิชาญ สีดาแก้ว","หมู่ 5","1 เดือน",""],
    [46157,"สีเหลือง","นายบัวพา สุวรรณรมย์","หมู่ 4","1 เดือน",""],
    [46161,"สีเหลือง","นายสุรชัย พิมพ์สอน","หมู่ 6","1 เดือน",""],
    [46160,"สีเหลือง","นายก้องเกียรติ อู่แก้ว","หมู่ 3","4สัปดาห์",""],
    [46165,"สีเขียว","นางสาวสุดาพร แก้วงาม","หมู่ 1","1 เดือน",""],
    [46167,"สีเหลือง","นายวีรชัย บัวถา","หมู่ 1","1 เดือน",""],
];

// ── Helper functions ────────────────────────────────────────────
function excelToDate(int $serial): string {
    // Excel serial: 1 = Jan 1, 1900; epoch offset = Dec 30, 1899
    return gmdate('Y-m-d', (int)(($serial - 25569) * 86400));
}

function parseGroupColor(?string $g): string {
    if (!$g) return 'yellow';
    if (str_contains($g, 'สีแดง'))  return 'red';
    if (str_contains($g, 'สีเขียว')) return 'green';
    return 'yellow';
}

function parseInterval(?string $s): int {
    if (!$s) return 30;
    if (preg_match('/3\s*เดือน/', $s))    return 90;
    if (preg_match('/1\s*เดือน/', $s))    return 30;
    if (preg_match('/4\s*สัปดาห์?/', $s)) return 28;
    if (preg_match('/3\s*สัปดาห์?/', $s)) return 21;
    if (preg_match('/2\s*สัปดาห์?/', $s)) return 14;
    return 30;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['run'])) {
    // ── Run setup ─────────────────────────────────────────────
    try {
        // Connect without selecting DB first
        $pdo = new PDO(
            "mysql:host={$host};charset=utf8mb4",
            $user, $pass,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        $steps[] = '✅ เชื่อมต่อ MySQL สำเร็จ';

        // Create database
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$dbname}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE `{$dbname}`");
        $steps[] = "✅ สร้างฐานข้อมูล `{$dbname}` สำเร็จ";

        // Create tables
        $pdo->exec("
        CREATE TABLE IF NOT EXISTS patients (
          id         INT AUTO_INCREMENT PRIMARY KEY,
          name       VARCHAR(200) NOT NULL,
          village    VARCHAR(50)  DEFAULT '',
          created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uk_name (name(191))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("
        CREATE TABLE IF NOT EXISTS injection_records (
          id             INT AUTO_INCREMENT PRIMARY KEY,
          patient_id     INT          NOT NULL,
          injection_date DATE         NOT NULL,
          group_color    ENUM('red','yellow','green') NOT NULL DEFAULT 'yellow',
          group_label    VARCHAR(50)  DEFAULT '',
          interval_str   VARCHAR(30)  DEFAULT '1 เดือน',
          interval_days  INT          DEFAULT 30,
          note           TEXT,
          created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
          KEY idx_patient_date (patient_id, injection_date),
          FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("
        CREATE TABLE IF NOT EXISTS home_visits (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          patient_id   INT,
          patient_name VARCHAR(200) DEFAULT '',
          village      VARCHAR(50)  DEFAULT '',
          visit_type   ENUM('staff','aosomo') NOT NULL DEFAULT 'aosomo',
          visit_date   DATE         NOT NULL,
          visitor      VARCHAR(100) DEFAULT '',
          checks_json  TEXT,
          score        INT          DEFAULT 0,
          note         TEXT,
          refer        TINYINT(1)   DEFAULT 0,
          next_appt    DATE,
          created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        $pdo->exec("
        CREATE TABLE IF NOT EXISTS settings (
          setting_key   VARCHAR(100) PRIMARY KEY,
          setting_value TEXT         DEFAULT '',
          updated_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

        // Default settings
        $pdo->exec("INSERT IGNORE INTO settings (setting_key, setting_value) VALUES
          ('hospital_name','รพ.สต.สองคอน'),('alert_days','1'),
          ('telegram_bot','@JitHomeBot'),('telegram_chatid','-1001234567890'),
          ('line_token',''),('sheets_url',''),
          ('cloud_backup','1'),('hosxp_enabled','1'),('line_enabled','1'),('telegram_enabled','1')");

        $steps[] = '✅ สร้างตารางและค่าเริ่มต้นสำเร็จ';

        // Create views
        $pdo->exec("DROP VIEW IF EXISTS patient_status");
        $pdo->exec("CREATE VIEW patient_status AS
          SELECT p.id, p.name, p.village,
            ir.id AS record_id, ir.injection_date AS last_date,
            ir.group_color, ir.group_label, ir.interval_str, ir.interval_days, ir.note,
            DATE_ADD(ir.injection_date, INTERVAL ir.interval_days DAY) AS next_date,
            DATEDIFF(DATE_ADD(ir.injection_date, INTERVAL ir.interval_days DAY), CURDATE()) AS days_until
          FROM patients p
          INNER JOIN injection_records ir ON ir.id = (
            SELECT id FROM injection_records r2 WHERE r2.patient_id = p.id
            ORDER BY injection_date DESC, id DESC LIMIT 1)");

        $pdo->exec("DROP VIEW IF EXISTS monthly_trend");
        $pdo->exec("CREATE VIEW monthly_trend AS
          SELECT DATE_FORMAT(injection_date,'%Y-%m') AS month_key,
            COUNT(*) AS total,
            SUM(group_color='red') AS red_count,
            SUM(group_color='yellow') AS yellow_count,
            SUM(group_color='green') AS green_count
          FROM injection_records
          GROUP BY DATE_FORMAT(injection_date,'%Y-%m')
          ORDER BY month_key");

        $steps[] = '✅ สร้าง Views สำเร็จ';

        // Import raw data
        $insPatient = $pdo->prepare("INSERT IGNORE INTO patients (name, village) VALUES (?,?)");
        $insRecord  = $pdo->prepare(
            "INSERT INTO injection_records
               (patient_id, injection_date, group_color, group_label, interval_str, interval_days, note)
             VALUES (?,?,?,?,?,?,?)"
        );
        $selPatient = $pdo->prepare("SELECT id FROM patients WHERE name = ?");

        $patientCache = [];
        $imported     = 0;

        $pdo->beginTransaction();
        foreach ($RAW as $row) {
            [$serial, $groupStr, $name, $village, $intervalStr, $note] = $row;
            if (!$name || $name === 'ทดสอบ') continue;

            $date         = excelToDate((int)$serial);
            $groupColor   = parseGroupColor($groupStr);
            $groupLabel   = match($groupColor) {
                'red'   => 'สุขภาพจิต กลุ่ม สีแดง',
                'green' => 'สุขภาพจิต กลุ่ม สีเขียว',
                default => 'สุขภาพจิต กลุ่ม สีเหลือง',
            };
            $intervalDays = parseInterval($intervalStr);
            $intStr       = $intervalStr ?: '1 เดือน';

            // Upsert patient
            if (!isset($patientCache[$name])) {
                $insPatient->execute([$name, $village]);
                $selPatient->execute([$name]);
                $patientCache[$name] = (int)$selPatient->fetchColumn();
            }
            $pid = $patientCache[$name];
            if (!$pid) continue;

            $insRecord->execute([$pid, $date, $groupColor, $groupLabel, $intStr, $intervalDays, $note]);
            $imported++;
        }
        $pdo->commit();

        $steps[] = "✅ นำเข้าข้อมูล {$imported} รายการ สำเร็จ";

        // Sample home visits
        $pdo->exec("INSERT IGNORE INTO home_visits
          (patient_name, village, visit_type, visit_date, visitor, checks_json, score, note, refer)
          VALUES
          ('นายอุทัย แสงงาม','หมู่ 5','staff','2026-04-10','นางสาวสมจิต','[\"s1\",\"s2\",\"s3\",\"s5\",\"s6\"]',5,'อาการคงที่ ครอบครัวให้ความร่วมมือดี',0),
          ('นายศักดา เรืองสา','หมู่ 8','aosomo','2026-04-18','นายวีระ อสม.','[\"a1\",\"a2\",\"a3\",\"a4\",\"a6\"]',5,'กินยาสม่ำเสมอ อาการดีขึ้น',0),
          ('นายอุุดร ไชยพันโท','หมู่ 9','aosomo','2026-04-20','นางมาลี อสม.','[\"a1\"]',1,'ไม่พบตัว ครอบครัวแจ้งออกไปข้างนอก',1),
          ('นายสุรชัย พิมพ์สอน','หมู่ 6','staff','2026-04-22','นางสาวสมจิต','[\"s1\",\"s2\",\"s3\",\"s4\",\"s5\",\"s6\",\"s8\"]',7,'อาการปกติ ยาเพียงพอ นัดฉีดยา 20 พ.ค.',0)");

        $steps[] = '✅ สร้างข้อมูลตัวอย่างเยี่ยมบ้านสำเร็จ';

        // Update config file
        $configContent = "<?php\ndefine('DB_HOST', " . var_export($host,true) . ");\ndefine('DB_NAME', " . var_export($dbname,true) . ");\ndefine('DB_USER', " . var_export($user,true) . ");\ndefine('DB_PASS', " . var_export($pass,true) . ");\ndefine('DB_CHARSET', 'utf8mb4');\n\nfunction getDB(): PDO {\n    static \$pdo = null;\n    if (\$pdo === null) {\n        \$dsn = 'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset='.DB_CHARSET;\n        \$options = [PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_EMULATE_PREPARES=>false];\n        \$pdo = new PDO(\$dsn, DB_USER, DB_PASS, \$options);\n    }\n    return \$pdo;\n}\n\nfunction getSetting(string \$key, string \$default = ''): string {\n    try { \$db=getDB(); \$st=\$db->prepare('SELECT setting_value FROM settings WHERE setting_key=?'); \$st->execute([\$key]); \$row=\$st->fetch(); return \$row?\$row['setting_value']:\$default; } catch(PDOException \$e){ return \$default; }\n}\n";

        file_put_contents(__DIR__ . '/config/db.php', $configContent);
        touch(__DIR__ . '/.setup_done');
        $steps[] = '✅ บันทึก config/db.php สำเร็จ';

    } catch (PDOException $e) {
        $errors[] = '❌ ' . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>JitHome — Setup</title>
<link href="https://fonts.googleapis.com/css2?family=Sarabun:wght@400;600;700&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Sarabun',sans-serif;background:#f2f6f9;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
.card{background:#fff;border-radius:16px;padding:32px;max-width:480px;width:100%;box-shadow:0 4px 20px rgba(0,0,0,.1)}
h1{font-size:22px;font-weight:800;color:#0a7ea4;margin-bottom:6px}
p{font-size:13px;color:#8a9ab0;margin-bottom:24px}
label{display:block;font-size:12px;font-weight:600;color:#4a5568;margin-bottom:5px}
input{width:100%;padding:9px 12px;border:1.5px solid #e2eaf2;border-radius:8px;font-family:'Sarabun',sans-serif;font-size:14px;margin-bottom:14px;outline:none}
input:focus{border-color:#0a7ea4;box-shadow:0 0 0 3px rgba(10,126,164,.1)}
button{width:100%;padding:12px;background:#0a7ea4;color:#fff;border:none;border-radius:8px;font-family:'Sarabun',sans-serif;font-size:15px;font-weight:700;cursor:pointer}
button:hover{background:#065f7d}
.step{padding:8px 12px;border-radius:8px;font-size:13px;margin-bottom:8px;background:#ecfdf5;color:#065f46}
.error{background:#fef2f2;color:#dc2626}
.success-box{text-align:center;padding:20px}
.success-box a{display:inline-block;margin-top:16px;padding:12px 28px;background:#0a7ea4;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px}
</style>
</head>
<body>
<div class="card">
  <?php if (!empty($steps) && empty($errors)): ?>
    <div class="success-box">
      <div style="font-size:48px;margin-bottom:12px">🎉</div>
      <h1>Setup สำเร็จ!</h1>
      <p style="margin:8px 0 0">ระบบ JitHome พร้อมใช้งานแล้ว</p>
      <?php foreach ($steps as $s): ?><div class="step"><?= htmlspecialchars($s) ?></div><?php endforeach; ?>
      <a href="/">เข้าสู่ระบบ JitHome →</a>
    </div>
  <?php else: ?>
    <h1>🏥 JitHome Setup</h1>
    <p>ตั้งค่าฐานข้อมูล MySQL และนำเข้าข้อมูลตัวอย่าง</p>

    <?php foreach ($errors as $e): ?><div class="step error"><?= htmlspecialchars($e) ?></div><?php endforeach; ?>
    <?php foreach ($steps  as $s): ?><div class="step"><?= htmlspecialchars($s) ?></div><?php endforeach; ?>

    <form method="POST">
      <label>MySQL Host</label>
      <input name="host"   value="<?= htmlspecialchars($host) ?>">
      <label>Database Name</label>
      <input name="dbname" value="<?= htmlspecialchars($dbname) ?>">
      <label>Username</label>
      <input name="user"   value="<?= htmlspecialchars($user) ?>">
      <label>Password</label>
      <input name="pass" type="password" value="<?= htmlspecialchars($pass) ?>">
      <input type="hidden" name="run" value="1">
      <button type="submit">🚀 เริ่ม Setup</button>
    </form>
  <?php endif; ?>
</div>
</body>
</html>
