// macOS: 인증서 없이도 앱이 실행되도록 .dmg로 묶기 전에 임시(ad-hoc) 서명을 한다.
// (Apple Silicon Mac은 서명이 깨진 앱을 '손상됨'으로 막는다)
const { execFileSync } = require('child_process');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' });
  console.log('  • ad-hoc 서명 완료:', app);
};
