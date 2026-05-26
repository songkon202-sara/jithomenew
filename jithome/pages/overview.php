<?php
// ─── Overview Page ─────────────────────────────────────────────
$patients = getAllPatients($db);

$total  = count($patients);
$red    = array_filter($patients, fn($p) => $p['group_color'] === 'red');
$yellow = array_filter($patients, fn($p) => $p['group_color'] === 'yellow');
$green  = array_filter($patients, fn($p) => $p['group_color'] === 'green');

$rc = count($red); $yc = count($yellow); $gc = count($green);

// Appointment status
$overdue  = count(array_filter($patients, fn($p) => (int)$p['days_until'] < 0));
$todayPts = count(array_filter($patients, fn($p) => (int)$p['days_until'] === 0));
$soon     = count(array_filter($patients, fn($p) => (int)$p['days_until'] > 0 && (int)$p['days_until'] <= 7));
$ok       = count(array_filter($patients, fn($p) => (int)$p['days_until'] > 7));

// By village
$villageMap = [];
foreach ($patients as $p) {
    $v = $p['village'] ?: 'ไม่ระบุ';
    if (!isset($villageMap[$v])) $villageMap[$v] = ['name'=>$v,'red'=>0,'yellow'=>0,'green'=>0,'total'=>0];
    $villageMap[$v][$p['group_color']]++;
    $villageMap[$v]['total']++;
}
usort($villageMap, fn($a,$b) => $b['total'] - $a['total']);

// Interval distribution
$intervalCounts = ['2 สัปดาห์'=>0,'3 สัปดาห์'=>0,'4 สัปดาห์'=>0,'1 เดือน'=>0,'3 เดือน'=>0];
foreach ($patients as $p) {
    $s = trim($p['interval_str'] ?? '');
    if (preg_match('/3\s*เดือน/', $s))    $intervalCounts['3 เดือน']++;
    elseif (preg_match('/1\s*เดือน/', $s)) $intervalCounts['1 เดือน']++;
    elseif (preg_match('/4\s*สัปดาห์?/', $s)) $intervalCounts['4 สัปดาห์']++;
    elseif (preg_match('/3\s*สัปดาห์?/', $s)) $intervalCounts['3 สัปดาห์']++;
    elseif (preg_match('/2\s*สัปดาห์?/', $s)) $intervalCounts['2 สัปดาห์']++;
    else $intervalCounts['1 เดือน']++;
}
arsort($intervalCounts);
$maxInterval = max($intervalCounts) ?: 1;

// SVG donut chart
function donutChart(int $red, int $yellow, int $green, int $size = 120): string {
    $total   = max($red + $yellow + $green, 1);
    $r       = 40; $cx = 60; $cy = 60;
    $circ    = 2 * M_PI * $r;
    $rd      = ($red/$total)*$circ;
    $yd      = ($yellow/$total)*$circ;
    $gd      = ($green/$total)*$circ;
    $rOff    = 0;
    $yOff    = -$rd;
    $gOff    = -($rd+$yd);

    $parts = '<circle cx="'.$cx.'" cy="'.$cy.'" r="'.$r.'" fill="none" stroke="var(--border)" stroke-width="16"/>';
    if ($red)    $parts .= '<circle cx="'.$cx.'" cy="'.$cy.'" r="'.$r.'" fill="none" stroke="#dc2626" stroke-width="16" stroke-dasharray="'.$rd.' '.$circ.'" stroke-dashoffset="'.$rOff.'"/>';
    if ($yellow) $parts .= '<circle cx="'.$cx.'" cy="'.$cy.'" r="'.$r.'" fill="none" stroke="#d97706" stroke-width="16" stroke-dasharray="'.$yd.' '.$circ.'" stroke-dashoffset="'.$yOff.'"/>';
    if ($green)  $parts .= '<circle cx="'.$cx.'" cy="'.$cy.'" r="'.$r.'" fill="none" stroke="#059669" stroke-width="16" stroke-dasharray="'.$gd.' '.$circ.'" stroke-dashoffset="'.$gOff.'"/>';

    return '<svg width="'.$size.'" height="'.$size.'" viewBox="0 0 120 120" style="transform:rotate(-90deg)">'.$parts.'</svg>';
}

// Monthly trend from injection_records
$thMonths = ['','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
$trends   = $db->query('SELECT month_key, total, red_count, yellow_count, green_count FROM monthly_trend ORDER BY month_key DESC LIMIT 9')->fetchAll();
$trends   = array_reverse($trends);
$n        = count($trends);
?>

<div class="page">
  <div class="page-title">ภาพรวมผู้ป่วย</div>
  <div class="page-sub">สรุปข้อมูล <?= e($hospitalName) ?> · <?= $total ?> ราย</div>

  <!-- Donut + group summary -->
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
    <div style="font-weight:700;font-size:14px;margin-bottom:14px;color:var(--text)">จำแนกตามกลุ่มสี</div>
    <div style="display:flex;align-items:center;gap:16px">
      <div style="position:relative;flex-shrink:0">
        <?= donutChart($rc, $yc, $gc) ?>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:22px;font-weight:800;color:var(--text)"><?= $total ?></div>
          <div style="font-size:10px;color:var(--text3)">ราย</div>
        </div>
      </div>
      <div style="flex:1">
        <?php foreach ([['red','สีแดง','var(--red)',$rc],['yellow','สีเหลือง','var(--yellow)',$yc],['green','สีเขียว','var(--green)',$gc]] as [$g,$lbl,$clr,$cnt]): ?>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:10px;height:10px;border-radius:50%;background:<?= $clr ?>"></div>
            <span style="font-size:13px;font-weight:500"><?= $lbl ?></span>
          </div>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:60px;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
              <div style="width:<?= $total > 0 ? round($cnt/$total*100) : 0 ?>%;height:100%;background:<?= $clr ?>;border-radius:3px"></div>
            </div>
            <span style="font-size:13px;font-weight:700;color:<?= $clr ?>;width:28px;text-align:right"><?= $cnt ?></span>
          </div>
        </div>
        <?php endforeach; ?>
        <div style="font-size:11px;color:var(--text3);margin-top:8px;text-align:right">
          <?= $total > 0 ? round($rc/$total*100) : 0 ?>% / <?= $total > 0 ? round($yc/$total*100) : 0 ?>% / <?= $total > 0 ? round($gc/$total*100) : 0 ?>%
        </div>
      </div>
    </div>
  </div>

  <!-- Appointment status -->
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
    <div style="font-weight:700;font-size:14px;margin-bottom:12px;color:var(--text)">สถานะการนัดหมาย</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <?php foreach ([
        ['เกินวันนัด',$overdue,'var(--red)','var(--red-lt)','var(--red-bd)','⚠️'],
        ['วันนี้',$todayPts,'var(--primary)','var(--primary-lt)','rgba(10,126,164,.2)','📅'],
        ['ภายใน 7 วัน',$soon,'var(--yellow)','var(--yellow-lt)','var(--yellow-bd)','🔔'],
        ['ปกติ',$ok,'var(--green)','var(--green-lt)','var(--green-bd)','✅'],
      ] as [$lbl,$cnt,$clr,$bg,$bd,$ico]): ?>
      <div style="background:<?= $bg ?>;border:1px solid <?= $bd ?>;border-radius:10px;padding:12px 14px">
        <div style="font-size:20px"><?= $ico ?></div>
        <div style="font-size:22px;font-weight:800;color:<?= $clr ?>;margin-top:4px"><?= $cnt ?></div>
        <div style="font-size:11px;color:<?= $clr ?>;font-weight:600;opacity:.8"><?= $lbl ?></div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>

  <!-- By village -->
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
    <div style="font-weight:700;font-size:14px;margin-bottom:14px;color:var(--text)">จำแนกตามหมู่บ้าน</div>
    <?php foreach ($villageMap as $v): ?>
    <div style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px">
        <span style="font-size:13px;font-weight:600;color:var(--text)"><?= e($v['name']) ?></span>
        <div style="display:flex;gap:6px;align-items:center">
          <?php if ($v['red']>0):   ?><span style="font-size:11px;font-weight:700;color:var(--red);background:var(--red-lt);padding:1px 6px;border-radius:20px">แดง <?= $v['red'] ?></span><?php endif; ?>
          <?php if ($v['yellow']>0):?><span style="font-size:11px;font-weight:700;color:var(--yellow);background:var(--yellow-lt);padding:1px 6px;border-radius:20px">เหลือง <?= $v['yellow'] ?></span><?php endif; ?>
          <?php if ($v['green']>0): ?><span style="font-size:11px;font-weight:700;color:var(--green);background:var(--green-lt);padding:1px 6px;border-radius:20px">เขียว <?= $v['green'] ?></span><?php endif; ?>
        </div>
      </div>
      <div style="display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--border)">
        <?php if ($v['red']>0):    ?><div style="flex:<?= $v['red'] ?>;background:var(--red)"></div><?php endif; ?>
        <?php if ($v['yellow']>0): ?><div style="flex:<?= $v['yellow'] ?>;background:var(--yellow)"></div><?php endif; ?>
        <?php if ($v['green']>0):  ?><div style="flex:<?= $v['green'] ?>;background:var(--green)"></div><?php endif; ?>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:3px">รวม <?= $v['total'] ?> ราย</div>
    </div>
    <?php endforeach; ?>
  </div>

  <!-- Village × Group table -->
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px;overflow-x:auto">
    <div style="font-weight:700;font-size:14px;margin-bottom:14px;color:var(--text)">ตารางสรุป หมู่บ้าน × กลุ่มสี</div>
    <table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead>
        <tr style="background:var(--bg)">
          <th style="padding:8px 10px;text-align:left;font-weight:700;color:var(--text2)">หมู่บ้าน</th>
          <th style="padding:8px 6px;text-align:center;color:var(--red);font-weight:700">🔴 แดง</th>
          <th style="padding:8px 6px;text-align:center;color:var(--yellow);font-weight:700">🟡 เหลือง</th>
          <th style="padding:8px 6px;text-align:center;color:var(--green);font-weight:700">🟢 เขียว</th>
          <th style="padding:8px 10px;text-align:center;font-weight:700;color:var(--text2)">รวม</th>
        </tr>
      </thead>
      <tbody>
        <?php foreach ($villageMap as $i => $v): ?>
        <tr style="border-bottom:1px solid var(--border);background:<?= $i%2===0?'transparent':'rgba(0,0,0,.01)' ?>">
          <td style="padding:9px 10px;font-weight:600"><?= e($v['name']) ?></td>
          <td style="padding:9px 6px;text-align:center;color:<?= $v['red']>0?'var(--red)':'var(--text3)' ?>;font-weight:<?= $v['red']>0?700:400 ?>"><?= $v['red'] ?: '—' ?></td>
          <td style="padding:9px 6px;text-align:center;color:<?= $v['yellow']>0?'var(--yellow)':'var(--text3)' ?>;font-weight:<?= $v['yellow']>0?700:400 ?>"><?= $v['yellow'] ?: '—' ?></td>
          <td style="padding:9px 6px;text-align:center;color:<?= $v['green']>0?'var(--green)':'var(--text3)' ?>;font-weight:<?= $v['green']>0?700:400 ?>"><?= $v['green'] ?: '—' ?></td>
          <td style="padding:9px 10px;text-align:center;font-weight:700;color:var(--text)"><?= $v['total'] ?></td>
        </tr>
        <?php endforeach; ?>
        <tr style="background:var(--bg);font-weight:700">
          <td style="padding:9px 10px;font-weight:800">รวมทั้งหมด</td>
          <td style="padding:9px 6px;text-align:center;color:var(--red)"><?= $rc ?></td>
          <td style="padding:9px 6px;text-align:center;color:var(--yellow)"><?= $yc ?></td>
          <td style="padding:9px 6px;text-align:center;color:var(--green)"><?= $gc ?></td>
          <td style="padding:9px 10px;text-align:center;color:var(--primary);font-size:14px"><?= $total ?></td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Injection interval -->
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
    <div style="font-weight:700;font-size:14px;margin-bottom:14px;color:var(--text)">รอบการฉีดยา</div>
    <?php foreach ($intervalCounts as $lbl => $cnt): if ($cnt === 0) continue; ?>
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:13px;font-weight:500;color:var(--text)"><?= e($lbl) ?></span>
        <span style="font-size:13px;font-weight:700;color:var(--primary)"><?= $cnt ?> ราย</span>
      </div>
      <div style="background:var(--border);border-radius:6px;height:10px;overflow:hidden">
        <div style="width:<?= round($cnt/$maxInterval*100) ?>%;background:var(--primary);height:100%;border-radius:6px"></div>
      </div>
    </div>
    <?php endforeach; ?>
  </div>

  <!-- Line chart: monthly trend -->
  <?php if ($n >= 2): ?>
  <?php
    $W = 320; $H = 130; $padL = 28; $padR = 12; $padT = 12; $padB = 28;
    $chartW = $W - $padL - $padR;
    $chartH = $H - $padT - $padB;
    $totals  = array_column($trends, 'total');
    $reds    = array_column($trends, 'red_count');
    $yellows = array_column($trends, 'yellow_count');
    $greens  = array_column($trends, 'green_count');
    $maxVal  = max(max($totals), 1);
    $labels  = array_map(function($t) use ($thMonths) {
        [$yr,$m] = explode('-', $t['month_key']);
        return $thMonths[(int)$m];
    }, $trends);

    function linePoints(array $arr, int $n, float $cw, float $ch, int $padL, int $padT, float $maxVal): array {
        $pts = [];
        for ($i = 0; $i < $n; $i++) {
            $x = $padL + ($n > 1 ? $i * ($cw / ($n-1)) : 0);
            $y = $padT + $ch - (($arr[$i] / $maxVal) * $ch);
            $pts[] = [$x, $y];
        }
        return $pts;
    }

    function svgLine(array $pts, string $color, string $totalPts): string {
        $d = 'M' . implode(' L', array_map(fn($p) => $p[0].','.$p[1], $pts));
        $areaD = $d . ' L' . $pts[count($pts)-1][0] . ',' . $totalPts . ' L' . $pts[0][0] . ',' . $totalPts . ' Z';
        $dots  = implode('', array_map(fn($p) => '<circle cx="'.$p[0].'" cy="'.$p[1].'" r="3.5" fill="'.$color.'" stroke="#fff" stroke-width="1.5"/>', $pts));
        return '<path d="'.$areaD.'" fill="'.$color.'" fill-opacity="0.08" stroke="none"/>
                <path d="'.$d.'" fill="none" stroke="'.$color.'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                '.$dots;
    }

    $bottomY = $padT + $chartH;
    $ptsTot  = linePoints($totals,  $n, $chartW, $chartH, $padL, $padT, $maxVal);
    $ptsRed  = linePoints($reds,    $n, $chartW, $chartH, $padL, $padT, $maxVal);
    $ptsYel  = linePoints($yellows, $n, $chartW, $chartH, $padL, $padT, $maxVal);
    $ptsGrn  = linePoints($greens,  $n, $chartW, $chartH, $padL, $padT, $maxVal);
    $yTicks  = [0, round($maxVal/2), $maxVal];
    $lastX   = $padL + ($n > 1 ? ($n-1) * ($chartW/($n-1)) : 0);
  ?>
  <div style="background:var(--card);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);margin-bottom:12px">
    <div style="font-weight:700;font-size:14px;margin-bottom:4px;color:var(--text)">แนวโน้มการนัดหมายรายเดือน</div>
    <div style="font-size:12px;color:var(--text3);margin-bottom:12px">จำนวนนัดฉีดยา จำแนกตามกลุ่มสี</div>
    <div style="display:flex;gap:14px;margin-bottom:10px;flex-wrap:wrap">
      <?php foreach ([['#0a7ea4','รวมทั้งหมด'],['#dc2626','สีแดง'],['#d97706','สีเหลือง'],['#059669','สีเขียว']] as [$c,$l]): ?>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:var(--text2);font-weight:600">
        <div style="width:20px;height:3px;background:<?= $c ?>;border-radius:2px"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:<?= $c ?>"></div>
        <?= $l ?>
      </div>
      <?php endforeach; ?>
    </div>
    <svg viewBox="0 0 <?= $W ?> <?= $H ?>" style="width:100%;height:auto;overflow:visible">
      <?php foreach ($yTicks as $v): $ty = $padT + $chartH - ($v/$maxVal)*$chartH; ?>
      <line x1="<?= $padL ?>" y1="<?= $ty ?>" x2="<?= $W-$padR ?>" y2="<?= $ty ?>" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3"/>
      <text x="<?= $padL-4 ?>" y="<?= $ty+4 ?>" text-anchor="end" font-size="8" fill="var(--text3)"><?= $v ?></text>
      <?php endforeach; ?>
      <?php foreach ($labels as $i => $lbl): ?>
      <text x="<?= $padL + ($n>1 ? $i*($chartW/($n-1)) : 0) ?>" y="<?= $H-4 ?>" text-anchor="middle" font-size="9" fill="var(--text3)"><?= $lbl ?></text>
      <?php endforeach; ?>
      <?= svgLine($ptsTot, '#0a7ea4', $bottomY) ?>
      <?= svgLine($ptsRed, '#dc2626', $bottomY) ?>
      <?= svgLine($ptsYel, '#d97706', $bottomY) ?>
      <?= svgLine($ptsGrn, '#059669', $bottomY) ?>
      <line x1="<?= $lastX ?>" y1="<?= $padT ?>" x2="<?= $lastX ?>" y2="<?= $padT+$chartH ?>" stroke="var(--primary)" stroke-width="1" stroke-dasharray="4,3" stroke-opacity="0.4"/>
      <text x="<?= $lastX ?>" y="<?= $padT-2 ?>" text-anchor="middle" font-size="8" fill="var(--primary)" font-weight="700">ปัจจุบัน</text>
    </svg>
    <!-- Last 3 months summary -->
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <?php foreach (array_slice($trends, -3) as $t): ?>
      <?php [$yr,$m] = explode('-', $t['month_key']); ?>
      <div style="flex:1;min-width:80px;background:var(--bg);border-radius:8px;padding:8px 10px;text-align:center">
        <div style="font-size:10px;color:var(--text3);margin-bottom:2px"><?= $thMonths[(int)$m] ?> <?= ((int)$yr+543) ?></div>
        <div style="font-size:18px;font-weight:800;color:var(--primary)"><?= $t['total'] ?></div>
        <div style="display:flex;justify-content:center;gap:4px;margin-top:3px">
          <?php if ($t['red_count']>0):    ?><span style="font-size:9px;background:var(--red-lt);color:var(--red);padding:1px 4px;border-radius:10px;font-weight:700">แดง <?= $t['red_count'] ?></span><?php endif; ?>
          <?php if ($t['yellow_count']>0): ?><span style="font-size:9px;background:var(--yellow-lt);color:var(--yellow);padding:1px 4px;border-radius:10px;font-weight:700">เหลือง <?= $t['yellow_count'] ?></span><?php endif; ?>
        </div>
      </div>
      <?php endforeach; ?>
    </div>
  </div>
  <?php endif; ?>
</div>
