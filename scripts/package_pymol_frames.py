#!/usr/bin/env python3
"""Export settings (--prepare), or package PyMOL frames for --structure 6onj/6oni."""
import argparse
import json
from pathlib import Path
import yaml
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--prepare', action='store_true')
parser.add_argument('--structure', default='6onj')
parser.add_argument('--dynamics-only', action='store_true')
args = parser.parse_args()
palettes = yaml.safe_load((ROOT / '_data/palettes.yml').read_text())
structures = yaml.safe_load((ROOT / '_data/structures.yml').read_text())
motion = yaml.safe_load((ROOT / '_data/hero_animation.yml').read_text())['presentation']
exports = {'palettes': {name: p['molecule'] for name, p in palettes.items()},
           'structures': structures, 'motion': motion}
for name, data in exports.items():
    (ROOT / f'assets/molecular/frame-{name}.json').write_text(json.dumps(data, indent=2) + '\n')
if args.prepare:
    raise SystemExit(0)
config = structures[args.structure]
manifest_path = ROOT / 'assets/molecular' / args.structure / 'frames.json'
manifest = json.loads(manifest_path.read_text()) if args.dynamics_only else {
    'renderer': 'PyMOL ray tracing', 'pdbId': config['pdb_id'], 'palettes': {}}
for palette in palettes:
    source = ROOT / 'preview/pymol-png' / args.structure / palette
    target = ROOT / 'assets/molecular' / args.structure / 'frames' / palette
    target.mkdir(parents=True, exist_ok=True)
    if args.dynamics_only:
        settings = manifest['palettes'][palette]
    else:
        settings = json.loads((source / 'settings.json').read_text())
        # Describe the settings actually rendered, even if YAML changed afterwards.
        if 'view' in manifest:
            assert manifest['view'] == settings['view'] and manifest['motion'] == settings['motion']
        manifest.update(view=settings['view'], motion=settings['motion'])
        for i in range(settings['count']):
            with Image.open(source / f'{i:04d}.png') as image:
                image.save(target / f'{i:04d}.webp', quality=86, method=3)
        manifest['palettes'][palette] = {**settings, 'path': f'frames/{palette}/', 'extension': 'webp'}
    layer_metadata = source / 'dynamics-settings.json'
    if layer_metadata.exists():
        layers = json.loads(layer_metadata.read_text())
        assert layers['view'] == manifest['view'], 'Endpoint layers need the same camera as the scroll frames.'
        assert layers['colors'] == settings['colors'], 'Endpoint layers need the same palette as the scroll frames.'
        assert all(layers['motion'][key] == manifest['motion'][key] for key in (
            'enable_rotation', 'enable_peptide_separation', 'enable_ligand_separation'))
        paths = {}
        for layer in ('receptor', 'partners'):
            with Image.open(source / f'dynamics-{layer}.png') as image:
                # Lossless alpha retains clean edges on every website palette.
                image.save(target / f'dynamics-{layer}.webp', lossless=True, method=3)
            paths[layer] = f'frames/{palette}/dynamics-{layer}.webp'
        manifest['palettes'][palette]['dynamics'] = paths
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
print(f'Packaged PyMOL frames for {args.structure}.')
