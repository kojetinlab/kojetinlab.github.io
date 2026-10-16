#!/usr/bin/env python3
"""Prepare identically oriented PDB components for Mol* and PyMOL.

Run prepare_molecule.py first. Only a rigid rotation is applied; no coordinates
are fitted or simulated. Ligand CONECT multiplicity follows the CCD dictionary.
"""
import json
import yaml
import argparse
from pathlib import Path
from prepare_molecule import mean, norm, sub, mul, dot, cross

ROOT = Path(__file__).resolve().parents[1]


def prepare(key='6onj'):
    config=yaml.safe_load((ROOT/'_data/structures.yml').read_text())[key]
    target=ROOT/'assets/molecular'/key
    data = json.loads((target / 'data.json').read_text())
    forward = norm(mean([a['xyz'] for a in data['ligand']['atoms']]))
    center = mean([r['xyz'] for r in data['peptide']['residues']])
    up = norm(sub(center, mul(forward, dot(center, forward))))
    right = norm(cross(up, forward))
    basis = [right, up, forward]
    source = (ROOT / f'molecular-source/{config["pdb_id"]}.pdb').read_text().splitlines()
    scene = {'pdbId': config['pdb_id'], 'components': {}, 'centers': {},
             'autoBasis': basis, 'coordinateOrigin': data['coordinateOrigin']}
    for name in ('receptor', 'peptide', 'ligand'):
        component = data[name]
        atoms = component.get('heavyAtoms', component.get('atoms'))
        chain = component['authorChain']
        lines = [line for line in source if
                 (line.startswith('HELIX ') and line[19] == chain or
                  line.startswith('SHEET ') and line[21] == chain)
                 and name != 'ligand']
        for atom in atoms:
            x, y, z = [dot(atom['xyz'], axis) for axis in basis]
            record = 'HETATM' if name == 'ligand' else 'ATOM  '
            atom_name = atom['name'].rjust(3).ljust(4)
            lines.append(
                f"{record}{atom['serial']:5d} {atom_name} "
                f"{atom['resname']:3s} {chain}{atom['resid']:4d} "
                f"   {x:8.3f}{y:8.3f}{z:8.3f}"
                f"{atom['occupancy']:6.2f}{atom['bFactor']:6.2f}"
                f"          {atom['element']:>2s}  "
            )
        if name == 'ligand':
            neighbors = {a['serial']: [] for a in atoms}
            for bond in component['bonds']:
                a, b = [atoms[bond[k]]['serial'] for k in ('a', 'b')]
                count = {'DOUB': 2, 'TRIP': 3}.get(bond['order'], 1)
                neighbors[a].extend([b] * count)
                neighbors[b].extend([a] * count)
            for a, bs in neighbors.items():
                for start in range(0, len(bs), 4):
                    lines.append('CONECT' + ''.join(f'{v:5d}' for v in [a] + bs[start:start+4]))
        lines.append('END')
        pdb = '\n'.join(lines) + '\n'
        scene['components'][name] = pdb
        points = [a['xyz'] for a in atoms] if name == 'ligand' else [r['xyz'] for r in component['residues']]
        scene['centers'][name] = [dot(mean(points), axis) for axis in basis]
        (target / f'{name}.pdb').write_text(pdb)
    (target / 'scene.json').write_text(json.dumps(scene, separators=(',', ':')) + '\n')
    print('Prepared three coordinate-preserving, oriented molecular components.')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--structure',default='all')
    args=parser.parse_args()
    configs=yaml.safe_load((ROOT/'_data/structures.yml').read_text())
    for key in configs if args.structure=='all' else [args.structure]:
        prepare(key)
