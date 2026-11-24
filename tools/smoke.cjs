const { app, BrowserWindow } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
app.setAppPath(root);
const profile = path.join(root, 'output', 'smoke-profile');
fs.mkdirSync(profile, { recursive: true });
app.setPath('userData', profile);
process.env.PET_SPECIES_ID = 'munchlax';
require(path.join(root, 'dist/main/index.js'));
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
app.whenReady().then(async () => {
  try {
    await delay(2500);
    const win = BrowserWindow.getAllWindows()[0];
    assert.ok(win, 'Pet window exists');
    assert.equal(win.isAlwaysOnTop(), true);
    const background = await win.webContents.executeJavaScript('getComputedStyle(document.body).backgroundColor');
    assert.equal(background, 'rgba(0, 0, 0, 0)', 'Renderer background transparent');
    const count = await win.webContents.executeJavaScript('document.querySelectorAll(".speech").length');
    assert.equal(count, 2, 'Both companions loaded');
    win.webContents.send('scene:command', 'demo');
    await delay(2200);
    const lines = await win.webContents.executeJavaScript('Array.from(document.querySelectorAll(".speech")).filter(e => !e.hidden).map(e => e.textContent)');
    assert.equal(lines.length, 2, 'Question and answer shown together');
    assert.ok(lines.every((line) => !line.includes('먹고자') && !line.includes('고라파덕')), 'Speech does not display character names');
    assert.equal(await win.webContents.executeJavaScript('document.fonts.check("27px Dongle")'), true, 'Bundled cute font is loaded');
    assert.equal(await win.webContents.executeJavaScript('document.querySelector("canvas").width === Math.round(innerWidth * devicePixelRatio)'), true, 'Canvas uses native display density');
    fs.mkdirSync(path.join(root, 'output'), { recursive: true });
    const screenshot = await win.webContents.capturePage();
    assert.equal(screenshot.toBitmap()[3], 0, 'Captured window background has zero alpha');
    fs.writeFileSync(path.join(root, 'output', 'companions-preview.png'), screenshot.toPNG());
    const pixels = screenshot.toBitmap();
    const size = screenshot.getSize();
    const viewport = win.getContentBounds();
    let grab;
    for (let y = Math.floor(size.height * 0.94); y < size.height && !grab; y++) {
      for (let x = 0; x < size.width / 2; x++) {
        const p = (y * size.width + x) * 4;
        if (pixels[p + 3] > 200 && pixels[p] > pixels[p + 2] + 10 && pixels[p + 1] > pixels[p + 2] + 10 && pixels[p + 2] > 60 && pixels[p + 2] < 180) {
          grab = { x: Math.round(x * viewport.width / size.width), y: Math.round(y * viewport.height / size.height) }; break;
        }
      }
    }
    assert.ok(grab, 'Munchlax pixels rendered');
    const original = await win.webContents.executeJavaScript('document.querySelector(".speech").style.left');
    const spriteTop = '(() => { const b = document.querySelector(".speech"); return parseFloat(b.style.top) + b.offsetHeight; })()';
    const originalTop = await win.webContents.executeJavaScript(spriteTop);
    win.webContents.sendInputEvent({ type: 'mouseMove', ...grab });
    await delay(100);
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...grab });
    await delay(100);
    win.webContents.sendInputEvent({ type: 'mouseMove', x: grab.x + 100, y: grab.y - 120 });
    await delay(180);
    const liftedTop = await win.webContents.executeJavaScript(spriteTop);
    assert.ok(liftedTop < originalTop - 60, `Held pet enters the interior (${originalTop} → ${liftedTop})`);
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: grab.x + 100, y: grab.y - 120 });
    await delay(100);
    const moved = await win.webContents.executeJavaScript('document.querySelector(".speech").style.left');
    console.log({ grab, original, moved, viewport, size, cursor: await win.webContents.executeJavaScript('document.querySelector("canvas").style.cursor') });
    assert.ok(Math.abs(parseFloat(moved) - parseFloat(original)) > 50, 'Drag moves the selected pet');
    await delay(1100);
    const landedTop = await win.webContents.executeJavaScript(spriteTop);
    assert.ok(landedTop > liftedTop + 60, 'Released pet falls back to the floor');
    win.webContents.send('scene:command', 'quiet');
    await delay(200);
    assert.equal(await win.webContents.executeJavaScript('Array.from(document.querySelectorAll(".speech")).filter(e => !e.hidden).length'), 0, 'Quiet mode hides bubbles');
    const visiblePixels = (image) => {
      const bitmap = image.toBitmap();
      let count = 0;
      for (let i = 3; i < bitmap.length; i += 4) if (bitmap[i] > 200) count++;
      return count;
    };
    const quietFrame = await win.webContents.capturePage();
    assert.ok(visiblePixels(quietFrame) > 1000, 'Pets remain visible without speech');
    await delay(14000);
    const laterFrame = await win.webContents.capturePage();
    assert.ok(visiblePixels(laterFrame) > 1000, 'Pets remain visible while idle in background');
    assert.notDeepEqual(laterFrame.toPNG(), quietFrame.toPNG(), 'Pets continue animating without speech');
    console.log('PASS: transparent window, two companions, dialogue, quiet mode, screenshot');
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
