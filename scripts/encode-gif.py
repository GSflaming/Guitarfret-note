"""Encode unmodified browser captures as a looping documentation GIF."""
from pathlib import Path
import json
import sys
from PIL import Image

folder, output = map(Path, sys.argv[1:])
durations = json.loads((folder / 'durations.json').read_text())
palette = Image.new('P', (1, 1))
palette.putpalette([value for gray in range(256) for value in (gray, gray, gray)])
frames = []
for index in range(len(durations)):
    with Image.open(folder / f'{index:03}.png') as source:
        # The actual app is monochrome. A stable palette keeps text sharp and
        # avoids per-frame palette flicker without adding colors or UI elements.
        frames.append(source.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE))
frames[0].save(output, save_all=True, append_images=frames[1:], duration=durations,
               loop=0, optimize=True, disposal=2)
print(f'{output.name}: {len(frames)} captured frames, {output.stat().st_size} bytes')
