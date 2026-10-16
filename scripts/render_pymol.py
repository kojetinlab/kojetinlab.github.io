#!/usr/bin/env python3
"""Ray trace scroll frames using a Python interpreter with PyMOL installed.

Example (macOS):
  /Applications/PyMOL.app/Contents/bin/python scripts/render_pymol.py

Then run: python3 scripts/package_pymol_frames.py
Frames use the same rigid transforms and configured projection as the live modes.
"""
import argparse
import json
import math
from pathlib import Path
import pymol2
from molecular_view import resolve_view

ROOT = Path(__file__).resolve().parents[1]


def smooth(a, b, t):
    x = max(0, min(1, (t-a)/(b-a)))
    return x*x*(3-2*x)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--structure', default='6onj')
    parser.add_argument('--frames', type=int, default=81)
    parser.add_argument('--size', type=int, default=640)
    parser.add_argument('--palette', default='all')
    parser.add_argument('--dynamics-only', action='store_true',
                        help='Render just the two separated endpoint layers for receptor rocking.')
    args = parser.parse_args()
    if args.frames < 2:
        parser.error('--frames must be at least 2')
    # JSON is generated from the same YAML that Jekyll uses by package script.
    palettes = json.loads((ROOT / 'assets/molecular/frame-palettes.json').read_text())
    config = json.loads((ROOT / 'assets/molecular/frame-structures.json').read_text())[args.structure]
    scene = json.loads((ROOT / f'assets/molecular/{args.structure}/scene.json').read_text())
    motion = json.loads((ROOT / 'assets/molecular/frame-motion.json').read_text())
    motion['enable_ligand_separation'] = motion['enable_ligand_separation'] and config['allow_ligand_separation']
    view = resolve_view(config['view'], scene)
    rotation = view['orientation']
    import numpy as np
    for palette, settings in palettes.items():
        if args.palette not in ('all', palette):
            continue
        output = ROOT / 'preview/pymol-png' / args.structure / palette
        output.mkdir(parents=True, exist_ok=True)
        with pymol2.PyMOL() as session:
            cmd = session.cmd
            cmd.set('max_threads', 4)
            cmd.set('orthoscopic', 0 if view['mode']=='perspective' else 1)
            cmd.set('field_of_view', math.degrees(view['fov']))
            cmd.set('ray_opaque_background', 0)
            cmd.set('antialias', 2)
            cmd.set('ray_shadows', 1)
            cmd.set('ambient', 0.40)
            cmd.set('direct', 0.65)
            cmd.set('specular', 0.25)
            cmd.set('shininess', 35)
            cmd.set('ray_trace_mode', 0)
            cmd.set('ray_trace_fog', 0)
            cmd.set('depth_cue', 0)
            cmd.set('cartoon_fancy_helices', 1)
            cmd.set('cartoon_smooth_loops', 1)
            cmd.set('cartoon_sampling', 14)
            cmd.set('cartoon_loop_radius', 0.23)
            cmd.set('cartoon_gap_cutoff', 0)
            cmd.set('stick_radius', 0.17)
            cmd.set('sphere_scale', 0.22)
            cmd.set('valence', 1)
            for name, pdb in scene['components'].items():
                cmd.read_pdbstr(pdb, name)
                color = settings[f'{name}_color'].lstrip('#')
                cmd.set_color(name + '_tint', [int(color[i:i+2], 16)/255 for i in (0, 2, 4)])
                cmd.color(name + '_tint', name)
            h12 = settings['helix12_color'].lstrip('#')
            cmd.set_color('h12_tint', [int(h12[i:i+2], 16)/255 for i in (0, 2, 4)])
            cmd.color('h12_tint', f"receptor and resi {config['h12_range'][0]}-{config['h12_range'][1]}")
            cmd.hide('everything')
            cmd.show('cartoon', 'receptor or peptide')
            cmd.show('sticks', 'ligand')
            cmd.show('spheres', 'ligand')
            cmd.color('blue', 'ligand and elem N')
            cmd.color('red', 'ligand and elem O')
            cmd.color('yellow', 'ligand and elem S')
            originals = {name: cmd.get_coords(name, 1).copy() @ np.array(rotation).T + np.array(view['offset']) for name in scene['components']}
            for i in ([args.frames - 1] if args.dynamics_only else range(args.frames)):
                p = i / (args.frames - 1)
                angle = .28 * smooth(0, 1, p) if motion.get('enable_rotation', True) else 0
                c, s = math.cos(angle), math.sin(angle)
                for name, original in originals.items():
                    coords = original.copy()
                    vector = [0, 0, 0]
                    if name == 'peptide' and motion.get('enable_peptide_separation', True):
                        vector = [v * smooth(.13, .48, p) for v in (16, 17, 2)]
                    elif name == 'ligand' and motion.get('enable_ligand_separation', True):
                        vector = [v * smooth(.44, .78, p) for v in (-23, -8, 12)]
                    coords += vector
                    x, z = coords[:, 0].copy(), coords[:, 2].copy()
                    coords[:, 0] = c*x + s*z
                    coords[:, 2] = -s*x + c*z
                    cmd.load_coords(coords, name, 1)
                span = view['span'] / (1 - view['zoom']['amount'] * smooth(view['zoom']['start'], view['zoom']['end'], p))
                distance = span / math.tan(view['fov']/2)
                fov_flag = math.degrees(view['fov']) * (-1 if view['mode']=='perspective' else 1)
                cmd.set_view((1,0,0, 0,1,0, 0,0,1, 0,0,-distance,
                              0,0,0, max(0.1,distance-100),distance+100,fov_flag))
                if not args.dynamics_only:
                    cmd.png(str(output / f'{i:04d}.png'), args.size, args.size, ray=1, quiet=1)
                if i == args.frames - 1:
                    # Keep the covalent 6ONI ligand in the receptor layer.
                    domain = ['receptor'] + ([] if config['allow_ligand_separation'] else ['ligand'])
                    partners = [name for name in scene['components'] if name not in domain]
                    for layer, names in [('receptor', domain), ('partners', partners)]:
                        cmd.disable('all')
                        for name in names:
                            cmd.enable(name)
                        cmd.png(str(output / f'dynamics-{layer}.png'), args.size, args.size, ray=1, quiet=1)
                    print(f'{palette}: receptor-motion layers rendered', flush=True)
                if not args.dynamics_only and i % 10 == 0:
                    print(f'{palette}: {i+1}/{args.frames}', flush=True)
        metadata = {'count': args.frames, 'size': args.size, 'colors': settings, 'view': config['view'], 'motion': motion, 'resolved_view': view}
        (output / 'dynamics-settings.json').write_text(json.dumps(metadata))
        if not args.dynamics_only:
            (output / 'settings.json').write_text(json.dumps(metadata))


if __name__ == '__main__':
    main()
