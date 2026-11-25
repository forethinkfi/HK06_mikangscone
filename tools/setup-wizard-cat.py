"""Build the wizard cat's transparent sprite strips from the two supplied JPEGs."""

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


CELL = 192


def remove_white_matte(image):
    alpha = image.getchannel('A')
    solid = alpha.filter(ImageFilter.MinFilter(5)).load()
    inside = alpha.load()
    result = image.copy()
    source = image.load()
    output = result.load()
    for y in range(image.height):
        for x in range(image.width):
            if not inside[x, y] or solid[x, y]:
                continue
            candidates = [(dx * dx + dy * dy, source[x + dx, y + dy])
                          for dy in range(-5, 6) for dx in range(-5, 6)
                          if 0 <= x + dx < image.width and 0 <= y + dy < image.height and solid[x + dx, y + dy]]
            if candidates:
                _, ref = min(candidates, key=lambda candidate: candidate[0])
            else:
                # Whiskers and cords can be thinner than the opaque core mask.
                ref = min((source[px, py]
                           for py in range(max(0, y - 2), min(image.height, y + 3))
                           for px in range(max(0, x - 2), min(image.width, x + 3)) if inside[px, py]),
                          key=lambda color: min(color[:3]))
            color = source[x, y][:3]
            opacity = min(1, (255 - min(color)) / max(1, 255 - min(ref[:3])))
            if opacity < 0.10:
                output[x, y] = (0, 0, 0, 0)
            elif opacity < 1:
                unmatted = [max(0, min(255, round(255 - (255 - channel) / opacity))) for channel in color]
                output[x, y] = (*unmatted, round(255 * opacity))
    return result


def crop(image, rect):
    return image.crop(tuple(round(value * (image.width / 1200 if index % 2 == 0 else image.height / 896))
                            for index, value in enumerate(rect)))


def clean(image, *, prop=False):
    image = image.convert('RGBA')
    pixels = image.load()
    for y in range(image.height):
        for x in range(image.width):
            r, g, b, _ = pixels[x, y]
            low = min(r, g, b)
            chroma = max(r, g, b) - low
            if low >= 247 or (chroma < 15 and low >= 174):
                pixels[x, y] = (0, 0, 0, 0)
            elif prop and not (r > g + 8 and g > b + 4 and 70 < r < 230):
                pixels[x, y] = (0, 0, 0, 0)
    image = remove_white_matte(image)
    box = image.getbbox()
    if not box:
        raise ValueError('Sprite frame is empty')
    return image.crop(box)


def cell(image, scale, anchor):
    size = (round(image.width * scale), round(image.height * scale))
    image = image.resize(size, Image.Resampling.LANCZOS)
    position = {
        'floor': ((CELL - image.width) // 2, CELL - image.height),
        'wall': (0, (CELL - image.height) // 2),
        'grip': ((CELL - image.width) // 2, 20),
        'fish': (CELL - image.width, CELL - image.height),
    }[anchor]
    result = Image.new('RGBA', (CELL, CELL))
    result.paste(image, position)
    return result


def rod_handle(rod):
    rod = rod.copy()
    w, h = rod.size
    for y in range(h):
        for x in range(w):
            red, green, blue, _ = rod.getpixel((x, y))
            if red < green + 4 or green < blue + 2 or (x > w*.66 and y > h*.64):
                rod.putpixel((x, y), (0, 0, 0, 0))
    return rod


def build(base, toy, dest):
    base_y = [0, 151, 302, 448, 600, 750, 896]
    toy_y = [0, 207, 452, 658, 896]

    def base_frame(r, c, inset=0):
        # The free part of the grip line is above the ears in these five cells.
        top = (481 if c == 6 else 482) if r == 3 and c >= 5 else base_y[r]
        return clean(crop(base, (120 * c + inset, top, 120 * (c + 1), base_y[r + 1])))

    def toy_frame(r, c):
        fish_in_cell = (r == 0 and c in (0, 5, 6, 7)) or (r == 1 and c < 4) or r == 3
        left = 150 * c + (11 if r == 0 and c == 1 else 1)
        right = 111 if r == 3 else 121 if fish_in_cell else 149
        return clean(crop(toy, (left, toy_y[r], 150 * c + right, toy_y[r + 1])))

    idle = [base_frame(0, c) for c in range(5)]
    scale = 155 / max(im.height for im in idle)
    toy_scale = 155 / max(toy_frame(0, c).height for c in (1, 2, 3, 4))
    sprites = dest / 'sprites'
    sprites.mkdir(parents=True, exist_ok=True)
    animations, motions = {}, {}

    def save(name, frames, fps, *, one_shot=False, anchor='floor', mirror=None, skill=False, sizing=scale, preserve=False):
        target = sprites / f'{name}.png'
        size = (CELL * len(frames), CELL)
        if preserve and target.exists():
            with Image.open(target) as strip:
                if strip.size != size or strip.mode != 'RGBA':
                    raise ValueError(f'Invalid retouched sprite strip: {target}')
        else:
            strip = Image.new('RGBA', size)
            for index, frame in enumerate(frames):
                strip.paste(cell(frame, sizing, anchor), (index * CELL, 0))
            strip.save(target, optimize=True)
        clip = dict(sheet=f'sprites/{name}.png', frameWidth=CELL, frameHeight=CELL,
                    frameCount=len(frames), fps=fps, loop=not one_shot, displaySize=120)
        if mirror:
            clip['mirrorWhen'] = mirror
        (motions if skill else animations)[name] = clip

    save('idle', idle, 3)
    # The fifth source pose briefly faces forward, breaking the side-view gait.
    save('walk', [base_frame(1, c) for c in (0, 1, 2, 3, 5, 6, 7, 8, 9)], 8, mirror='left',
         preserve=(sprites / 'walk-left.png').exists())
    if (sprites / 'walk-left.png').exists():
        animations['walk'].pop('mirrorWhen')
        animations['walk']['leftSheet'] = 'sprites/walk-left.png'
    for motion, name in (('frontWalk', 'walk-front'), ('backWalk', 'walk-back')):
        target = sprites / f'{name}.png'
        if target.exists():
            with Image.open(target) as strip:
                if strip.mode != 'RGBA' or strip.height != CELL or strip.width != 6 * CELL:
                    raise ValueError(f'Invalid walk sprite strip: {target}')
            motions[motion] = dict(sheet=f'sprites/{name}.png', frameWidth=CELL, frameHeight=CELL,
                                   frameCount=6, fps=7.5, loop=True, displaySize=120)
    save('sleep', [base_frame(2, c, 7 if c else 0) for c in range(5)], 2.3)
    # Keep the checked-in, retouched grab frames when regenerating the other clips.
    save('dragged', [base_frame(3, c) for c in range(5, 10)], 8, anchor='grip', preserve=True)
    animations['dragged']['authoredGrip'] = True
    save('look', [base_frame(0, c) for c in range(5, 10)], 8, skill=True, one_shot=True, mirror='left')
    motions['sideIdle'] = {**motions['look'], 'frameCount': 1, 'fps': 3, 'loop': True}
    if (sprites / 'side-idle-left.png').exists() and (sprites / 'side-idle.png').exists():
        side_idle = {**motions['sideIdle'], 'sheet': 'sprites/side-idle.png', 'leftSheet': 'sprites/side-idle-left.png'}
        side_idle.pop('mirrorWhen')
        motions['sideIdle'] = side_idle
        motions['look'] = {**side_idle, 'fps': 2, 'loop': False}
    save('jump', [base_frame(2, c) for c in range(5, 8)], 7, skill=True, one_shot=True, mirror='left')
    save('land', [base_frame(2, c) for c in (8, 9)], 10, skill=True, one_shot=True, mirror='left')
    save('climb', [base_frame(3, c, inset) for c, inset in enumerate((33, 33, 34, 34, 35))],
         7, skill=True, anchor='wall', mirror='right')
    motions['wallIdle'] = {**motions.pop('climb'), 'frameCount': 1}
    motions['wallFront'] = {**animations['idle'], 'frameCount': 1}
    for motion in ('wallIdle', 'wallFront'):
        clip = motions[motion]
        with Image.open(dest / clip['sheet']) as strip:
            alpha = strip.getchannel('A').crop((0, 0, CELL, CELL))
            left, _, right, _ = alpha.point(lambda a: 255 if a >= 24 else 0).getbbox()
        clip['wallInsets'] = dict(left=left, right=CELL - right)
    save('fly', [base_frame(4, c) for c in range(5)], 11, skill=True, mirror='left')
    save('wallImpact', [base_frame(4, 5, 18), base_frame(4, 6, 21)], 12,
         skill=True, one_shot=True, anchor='wall', mirror='right')
    save('wallFall', [base_frame(4, 7)] + [base_frame(5, c) for c in range(3)], 8, skill=True, mirror='right')
    save('ouch', [base_frame(4, c) for c in (8, 9)] + [base_frame(5, c) for c in (3, 4, 5)],
         8, skill=True, one_shot=True)
    save('recover', [base_frame(5, c) for c in (6, 7, 8, 9)], 7, skill=True, one_shot=True)
    animations['react'] = {**motions['recover']}
    save('toyWatch', [toy_frame(0, c) for c in range(5)], 11, skill=True, one_shot=True, mirror='left', sizing=toy_scale)
    save('toyPounce', [toy_frame(0, c) for c in (5, 6, 7)] + [toy_frame(1, c) for c in range(4)],
         15, skill=True, one_shot=True, mirror='left', sizing=toy_scale)
    save('toyLand', [toy_frame(1, c) for c in range(4, 8)], 12, skill=True, one_shot=True, mirror='left', sizing=toy_scale)
    save('toyAfter', [toy_frame(3, c) for c in range(8)], 13, skill=True, one_shot=True, mirror='left', sizing=toy_scale)

    rods = [clean(crop(toy, (150*c, toy_y[2], 150*(c+1), toy_y[3]))) for c in range(8)]
    pole = rod_handle(rods[0])
    pole.crop(pole.getbbox()).save(sprites / 'fishing-handle.png', optimize=True)
    clean(crop(toy, (99, 589, 135, 639)), prop=True).save(sprites / 'fishing-fish.png', optimize=True)
    rod_scale = 170 / max(rod.height for rod in rods)
    save('toyRod', rods, 9, skill=True, anchor='fish', sizing=rod_scale)
    hit = []
    for index, offset in enumerate((0, 12, 24, 32, 23, 10, 0)):
        rod = rod_handle(rods[index])
        w, h = rod.size
        c = min(index, 7)
        lure = clean(crop(toy, (150*c + 116, 713, min(1200, 150*c + 144), 857)), prop=True)
        lure = lure.resize((round(w*.22), round(h*.25)), Image.Resampling.LANCZOS)
        lx = w - lure.width
        ly = h - lure.height - round(h * offset / 145)
        draw = ImageDraw.Draw(rod)
        draw.line([(round(w*.85), round(h*.05)), (round(w*.76), round((ly+h*.05)*.47)), (lx+lure.width//2, ly+3)],
                  fill=(62, 59, 56, 255), width=max(2, round(w*.018)))
        rod.alpha_composite(lure, (lx, ly))
        hit.append(rod)
    save('toyRodHit', hit, 17, skill=True, one_shot=True, anchor='fish', sizing=rod_scale)

    config = dict(id='black-wizard-cat', displayName='꼬마 검은 마법사 고양이', version='1.0.0',
                  animations=animations, motions=motions,
                  fishingToy=dict(handle='sprites/fishing-handle.png', fish='sprites/fishing-fish.png'),
                  behavior=dict(walkSpeedPxPerSec=61, idleMinMs=1400, idleMaxMs=3100,
                                walkMinMs=4000, walkMaxMs=9500, spriteScale=120/CELL, personality='curious'),
                  attribution=dict(author='사용자 제공 이미지', license='User-provided project artwork'))
    (dest / 'species.json').write_text(json.dumps(config, ensure_ascii=False, indent=2) + '\n', encoding='utf8')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base', type=Path)
    parser.add_argument('toy', type=Path)
    args = parser.parse_args()
    build(Image.open(args.base), Image.open(args.toy), Path(__file__).resolve().parents[1] / 'assets/species/black-wizard-cat')
