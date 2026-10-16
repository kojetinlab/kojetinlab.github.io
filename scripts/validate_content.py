#!/usr/bin/env python3
"""Validate editable content and local image links before publishing."""
from pathlib import Path
import datetime as dt
import math
import json
from molecular_view import resolve_view
import re
import sys
import yaml
ROOT=Path(__file__).resolve().parents[1]

def main():
    errors=[]; ids={}; dois={}; pmids={}; counts={}
    for folder, required in {'_publications':['id','title','authors','journal','year','date'], '_members':['name','role','category','status'], '_research':['title','summary','order'], '_posts':['title','date']}.items():
        files=list((ROOT/folder).glob('*.md')); counts[folder]=len(files)
        for path in files:
            label=str(path.relative_to(ROOT))
            try:
                parts=path.read_text(encoding='utf-8').split('---',2)
                if len(parts)!=3: raise ValueError('Missing YAML front matter')
                data=yaml.safe_load(parts[1])
                if not isinstance(data,dict): raise ValueError('Front matter must be a mapping')
                for key in required:
                    if data.get(key) in [None,'',[]]: errors.append(f'{label}: missing {key}')
                for key in ['topics','pdb','bmrb','emdb','geo','additional_links','publication_ids']:
                    if key in data and not isinstance(data[key],list): errors.append(f'{label}: {key} must be a list')
                if folder=='_publications':
                    if not isinstance(data.get('authors'),list): errors.append(f'{label}: authors must be a list')
                    for key,seen in [('id',ids),('doi',dois),('pmid',pmids)]:
                        val=str(data.get(key,'')).strip().lower()
                        if val:
                            if val in seen: errors.append(f'{label}: duplicate {key} also in {seen[val]}')
                            seen[val]=label
                    if data.get('doi') and not re.fullmatch(r'10\.\d{4,9}/\S+',str(data['doi'])): errors.append(f'{label}: DOI should be an identifier, not a URL')
                if folder=='_members' and data.get('status') not in ['current','alumni']: errors.append(f'{label}: status must be current or alumni')
                if 'date' in data: dt.date.fromisoformat(str(data['date'])[:10])
                for key in ['image','photo','pdf']:
                    value=data.get(key)
                    if value and not str(value).startswith(('https://','http://')) and not (ROOT/str(value).lstrip('/')).is_file(): errors.append(f'{label}: missing {key}: {value}')
            except (ValueError,TypeError,yaml.YAMLError) as exc: errors.append(f'{label}: {exc}')
    for path in (ROOT/'_research').glob('*.md'):
        data=yaml.safe_load(path.read_text().split('---',2)[1])
        for pub_id in data.get('publication_ids',[]):
            if pub_id.lower() not in ids: errors.append(f'{path.name}: unknown publication ID {pub_id}')
    structures=yaml.safe_load((ROOT/'_data/structures.yml').read_text())
    display=yaml.safe_load((ROOT/'_data/display.yml').read_text())
    if display['molecular_structure'] not in structures:
        errors.append('display.yml: default molecular_structure must name a structure preset')
    for key, config in structures.items():
        try:
            if not re.fullmatch('[a-z0-9_-]+',key): raise ValueError('unsafe preset key')
            angles=config['view']['rotation_xyz']
            if len(angles)!=3 or not all(isinstance(v,(int,float)) and math.isfinite(v) for v in angles):
                raise ValueError('rotation_xyz needs three finite numbers in degrees')
            span=config['view'].get('camera_span')
            if span is not None and (not isinstance(span,(int,float)) or not math.isfinite(span) or span<=0):
                raise ValueError('camera_span must be positive')
            for asset in ('data.json','scene.json','poster.svg'):
                if not (ROOT/'assets/molecular'/key/asset).is_file():
                    raise ValueError(f'run molecular preparation: missing {asset}')
            camera=config['view'].get('camera')
            zoom=config['view'].get('scroll_zoom')
            if zoom and not (0 <= zoom['amount'] < 1 and 0 <= zoom['start'] < zoom['end'] <= 1):
                raise ValueError('scroll_zoom needs amount in [0,1) and 0 <= start < end <= 1')
            if camera:
                for vector in ('position','target','up'):
                    values=camera[vector]
                    if len(values)!=3 or not all(isinstance(v,(int,float)) and math.isfinite(v) for v in values):
                        raise ValueError(f'camera {vector} needs three finite numbers')
                if camera.get('mode') not in ('perspective','orthographic'):
                    raise ValueError('camera mode must be perspective or orthographic')
                if camera.get('position_type') not in ('fov_normalized','raw'):
                    raise ValueError('position_type must be fov_normalized or raw')
                if not 1 < camera.get('fov_degrees',45) < 150:
                    raise ValueError('camera field of view must be between 1 and 150 degrees')
            prepared_scene=json.loads((ROOT/'assets/molecular'/key/'scene.json').read_text())
            resolve_view(config['view'],prepared_scene)
            data=json.loads((ROOT/'assets/molecular'/key/'data.json').read_text())
            if data['pdbId']!=config['pdb_id']:
                raise ValueError('prepared PDB identity differs from configuration')
            for name in ('receptor','peptide','ligand'):
                if data[name]['authorChain']!=config[f'{name}_chain']:
                    raise ValueError(f'{name} chain differs from prepared data; regenerate assets')
        except (KeyError,ValueError,TypeError) as exc:
            errors.append(f'structures.yml {key}: {exc}')
    for error in errors: print('ERROR:',error)
    print(', '.join(f'{n} {k.removeprefix("_")}' for k,n in counts.items()))
    print(f'{len(errors)} content errors')
    return bool(errors)
if __name__=='__main__': sys.exit(main())
