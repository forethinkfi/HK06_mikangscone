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
    assert.ok(count >= 2, 'Both original companions loaded');
    // Keep the initial pets awake so this pointer test does not depend on the idle roll.
    await win.webContents.executeJavaScript('Math.random = () => 0; void 0;');
    const speciesRoot = path.join(root, 'personal-species');
    const loadFixture = (id) => {
      const config = JSON.parse(fs.readFileSync(path.join(speciesRoot, id, 'species.json'), 'utf8').replace(/^\uFEFF/, ''));
      const localSheets = (clips) => Object.fromEntries(Object.entries(clips ?? {}).map(([key, clip]) =>
        [key, { ...clip, sheet: `pet-asset://local/${id}/${clip.sheet}` }]));
      return { ...config, animations: localSheets(config.animations), motions: localSheets(config.motions) };
    };
    const { chatter } = JSON.parse(fs.readFileSync(path.join(speciesRoot, 'scene.json'), 'utf8').replace(/^\uFEFF/, ''));
    win.webContents.send('species:load', { ...loadFixture('munchlax'), companions: [loadFixture('psyduck')], chatter });
    await delay(350);
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
    const spriteTop = '(() => { const b = document.querySelector(".speech"); return parseFloat(b.style.top) + b.offsetHeight; })()';
    const originalTop = await win.webContents.executeJavaScript(spriteTop);
    win.webContents.sendInputEvent({ type: 'mouseMove', ...grab });
    await delay(100);
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...grab });
    await delay(100);
    win.webContents.sendInputEvent({ type: 'mouseMove', x: grab.x + 100, y: grab.y - 200 });
    await delay(180);
    const liftedTop = await win.webContents.executeJavaScript(spriteTop);
    assert.ok(liftedTop < originalTop - 35, `Held pet enters the interior (${originalTop} → ${liftedTop})`);
    const firstSpeech = '(() => { const b = document.querySelector(".speech"); return b.hidden ? "" : b.textContent; })()';
    assert.match(await win.webContents.executeJavaScript(firstSpeech), /잡지 마|내려갈래|발이 땅에서/, 'Grab shows its own reaction');
    const heldFrame = (await win.webContents.capturePage()).toPNG();
    await delay(110);
    assert.notDeepEqual((await win.webContents.capturePage()).toPNG(), heldFrame, 'Animation continues with a stationary pointer');
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: grab.x + 100, y: grab.y - 200 });
    await delay(1100);
    const landedTop = await win.webContents.executeJavaScript(spriteTop);
    assert.ok(landedTop > liftedTop + 35, 'Released pet falls back to the floor');
    assert.match(await win.webContents.executeJavaScript(firstSpeech), /다음엔/, 'Hard landing shows the landing-specific message');

    const floorGrab = { x: grab.x + 100, y: grab.y - 6 };
    win.webContents.sendInputEvent({ type: 'mouseMove', ...floorGrab });
    await delay(75);
    win.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...floorGrab });
    await delay(60);
    const flick = (x) => win.webContents.sendInputEvent({ type: 'mouseMove', x, y: floorGrab.y });
    flick(floorGrab.x + 22);
    await delay(155);
    flick(floorGrab.x + 23);
    await delay(51);
    flick(floorGrab.x + 28);
    const beforeFlick = await win.webContents.executeJavaScript(spriteTop);
    await delay(28);
    win.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: floorGrab.x + 28, y: floorGrab.y });
    await delay(105);
    const duringFlick = await win.webContents.executeJavaScript(spriteTop);
    assert.ok(duringFlick < beforeFlick - 2, `The gentle throw lifts off the floor (${beforeFlick} → ${duringFlick})`);
    await delay(305);
    assert.match(await win.webContents.executeJavaScript(firstSpeech), /한 번 더|조금 더 멀리|또 해줘/, 'A small floor-level flick gets the gentle throw reaction');

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
