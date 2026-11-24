// Character art stays local and is never committed to this repository.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const target = path.join(root, 'personal-species', 'munchlax');
const url = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/446.png';
async function setup() {
  fs.mkdirSync(target, { recursive: true });
  const imagePath = path.join(target, 'munchlax.png');
  if (!fs.existsSync(imagePath)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Image download failed: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Expected PNG');
    fs.writeFileSync(imagePath, bytes);
  }
  for (const name of ['species.json', '이미지 수정 안내.txt']) {
    const dest = path.join(target, name);
    if (!fs.existsSync(dest)) fs.copyFileSync(path.join(root, 'examples', 'munchlax', name), dest);
  }
  const friend = path.join(root, 'personal-species', 'psyduck');
  fs.mkdirSync(friend, { recursive: true });
  const friendImage = path.join(friend, 'psyduck.png');
  if (!fs.existsSync(friendImage)) {
    const response = await fetch(url.replace('446.png', '54.png'));
    if (!response.ok) throw new Error(`Companion download failed: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('Expected companion PNG');
    fs.writeFileSync(friendImage, bytes);
  }
  const friendConfig = path.join(friend, 'species.json');
  if (!fs.existsSync(friendConfig)) {
    const config = JSON.parse(fs.readFileSync(path.join(root, 'examples/munchlax/species.json'), 'utf8'));
    config.id = 'psyduck'; config.displayName = '고라파덕';
    config.behavior.walkSpeedPxPerSec = 48; config.behavior.spriteScale = 0.24;
    for (const animation of Object.values(config.animations)) animation.sheet = 'psyduck.png';
    fs.writeFileSync(friendConfig, JSON.stringify(config, null, 2));
  }
  const scene = path.join(root, 'personal-species', 'scene.json');
  if (!fs.existsSync(scene)) fs.copyFileSync(path.join(root, 'examples/scene.json'), scene);
  console.log(`Ready: ${target}\nRun npm start to launch.`);
}
setup().catch((error) => { console.error(error.message); process.exitCode = 1; });
