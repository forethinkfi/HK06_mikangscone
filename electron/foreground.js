// 지금 맨 앞에 있는 앱을 감시해서 "바탕화면"인지 "다른 앱(웹 등)을 쓰는 중"인지 알려준다.
// 네이티브 모듈 없이 OS 기본 도구만 쓴다.
//  - Windows: PowerShell 한 개를 계속 띄워 두고 user32의 GetForegroundWindow 결과를 읽는다.
//             창 클래스가 Progman / WorkerW 이면 바탕화면.
//  - macOS:   lsappinfo(권한 필요 없음)로 맨 앞 앱 이름과 pid를 읽는다. Finder가 맨 앞이면 바탕화면으로 본다.
const { spawn, execFile } = require('child_process');

const BROWSERS = /^(chrome|google chrome|msedge|microsoft edge|firefox|whale|naver whale|brave|brave browser|opera|vivaldi|safari|arc|iexplore|chromium|zen|orion)$/i;

const PS_SCRIPT = `
$ErrorActionPreference='SilentlyContinue'
[Console]::OutputEncoding=[System.Text.Encoding]::UTF8
Add-Type @"
using System; using System.Runtime.InteropServices; using System.Text;
public static class MkFg {
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
}
"@
$last=''
while($true){
  $h=[MkFg]::GetForegroundWindow(); $p=[uint32]0; [void][MkFg]::GetWindowThreadProcessId($h,[ref]$p)
  $sb=New-Object System.Text.StringBuilder 256; [void][MkFg]::GetClassName($h,$sb,256)
  $n=''; try{ $n=(Get-Process -Id $p).ProcessName }catch{}
  $line="$p|$n|$($sb.ToString())"
  if($line -ne $last){ [Console]::Out.WriteLine($line); [Console]::Out.Flush(); $last=$line }
  Start-Sleep -Milliseconds 500
}`;

/**
 * @param {(info:{kind:'desktop'|'app'|'self'|'unknown', name:string, browser:boolean})=>void} onChange
 * @param {()=>number[]} ownPids  이 앱 자신의 pid 목록 (내 창이 앞에 있으면 'self')
 */
function watchForeground(onChange, ownPids) {
  let last = '', stopped = false, child = null, timer = null;
  const emit = (info) => {
    const sig = info.kind + '|' + info.name;
    if (sig !== last) { last = sig; onChange(info); }
  };

  if (process.platform === 'win32') {
    const start = () => {
      if (stopped) return;
      const enc = Buffer.from(PS_SCRIPT, 'utf16le').toString('base64');
      child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', enc], { windowsHide: true });
      let buf = '';
      child.stdout.on('data', (d) => {
        buf += d.toString('utf8');
        let i;
        while ((i = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
          const [pid, name = '', cls = ''] = line.split('|');
          if (ownPids().includes(+pid)) emit({ kind: 'self', name, browser: false });
          else if (/^(Progman|WorkerW)$/.test(cls)) emit({ kind: 'desktop', name: 'Desktop', browser: false });
          else if (/^(Shell_TrayWnd|Shell_SecondaryTrayWnd|NotifyIconOverflowWindow|TopLevelWindowForOverflowXamlIsland|Windows\.UI\.Core\.CoreWindow)$/.test(cls)) { /* 작업표시줄·시작메뉴: 상태 유지 */ }
          else if (!+pid) emit({ kind: 'desktop', name: 'Desktop', browser: false });
          else emit({ kind: 'app', name, browser: BROWSERS.test(name) });
        }
      });
      child.on('exit', () => { child = null; if (!stopped) setTimeout(start, 3000); });
      child.on('error', () => { child = null; emit({ kind: 'unknown', name: '', browser: false }); });
    };
    start();
  } else if (process.platform === 'darwin') {
    const poll = () => {
      execFile('/bin/sh', ['-c', 'a=$(lsappinfo front); lsappinfo info -only name "$a"; lsappinfo info -only pid "$a"'], { timeout: 2000 }, (err, out) => {
        if (stopped) return;
        if (!err) {
          const name = (out.match(/"LSDisplayName"="([^"]*)"/) || [])[1] || '';
          const pid = +((out.match(/"pid"=(\d+)/) || [])[1] || 0);
          if (ownPids().includes(pid)) emit({ kind: 'self', name, browser: false });
          else if (name === 'Finder' || !name) emit({ kind: 'desktop', name: 'Finder', browser: false });
          else emit({ kind: 'app', name, browser: BROWSERS.test(name) });
        } else emit({ kind: 'unknown', name: '', browser: false });
        timer = setTimeout(poll, 600);
      });
    };
    poll();
  } else {
    // 리눅스 등 개발용: 감지하지 않는다 (트레이 메뉴에서 모드를 직접 고를 수 있다).
    emit({ kind: 'unknown', name: '', browser: false });
  }

  return () => { stopped = true; if (child) child.kill(); clearTimeout(timer); };
}

module.exports = { watchForeground };
