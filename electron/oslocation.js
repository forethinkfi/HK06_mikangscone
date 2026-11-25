// 컴퓨터의 위치 서비스로 현재 위치(위도·경도) 얻기
//  - Windows: Windows 위치 서비스(System.Device.Location) — 설정 > 개인 정보 및 보안 > 위치 >
//             '데스크톱 앱이 위치에 액세스하도록 허용'이 켜져 있어야 한다.
//  - macOS:   화면 쪽(navigator.geolocation)이 macOS 위치 서비스를 쓴다. 여기서는 처리하지 않는다.
const { execFile } = require('child_process');

const PS = `
$ErrorActionPreference='SilentlyContinue'
Add-Type -AssemblyName System.Device
$w = New-Object System.Device.Location.GeoCoordinateWatcher([System.Device.Location.GeoPositionAccuracy]::High)
[void]$w.TryStart($false, [TimeSpan]::FromSeconds(8))
$end = (Get-Date).AddSeconds(12)
while ((Get-Date) -lt $end) {
  if ($w.Permission -eq 'Denied') { break }
  if ($w.Status -eq 'Ready' -and -not $w.Position.Location.IsUnknown) { break }
  Start-Sleep -Milliseconds 300
}
if ($w.Permission -eq 'Denied') { 'DENIED' }
elseif ($w.Position.Location.IsUnknown) { 'UNKNOWN|' + $w.Status }
else { $l = $w.Position.Location; 'OK|' + $l.Latitude + '|' + $l.Longitude + '|' + $l.HorizontalAccuracy }
$w.Stop()`;

function windowsLocation() {
  return new Promise((resolve) => {
    const enc = Buffer.from(PS, 'utf16le').toString('base64');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', enc], { windowsHide: true, timeout: 25000 }, (err, out) => {
      const line = String(out || '').trim().split(/\r?\n/).pop() || '';
      if (line.startsWith('OK|')) {
        const [, lat, lon, acc] = line.split('|').map((v) => v.replace(',', '.'));
        const r = { ok: true, lat: +lat, lon: +lon, acc: Math.round(+acc) || null, src: 'os' };
        if (isFinite(r.lat) && isFinite(r.lon)) return resolve(r);
      }
      if (line === 'DENIED') return resolve({ ok: false, reason: 'denied' });
      resolve({ ok: false, reason: err ? 'error' : 'unknown' });
    });
  });
}

async function osLocation() {
  if (process.platform === 'win32') return windowsLocation();
  return { ok: false, reason: 'unsupported' };
}

module.exports = { osLocation };
