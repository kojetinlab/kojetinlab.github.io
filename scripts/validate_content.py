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
                if folder=='_members':
                    if data.get('status') not in ['current','alumni']: errors.append(f'{label}: status must be current or alumni')
                    if not isinstance(data.get('last_name'),str) or not data['last_name'].strip(): errors.append(f'{label}: last_name is required for alphabetical sorting')
                    if type(data.get('seniority')) is not int or data['seniority'] < 0: errors.append(f'{label}: seniority must be a nonnegative integer')
                    if data.get('joined_year') is not None and (type(data['joined_year']) is not int or not 1900 <= data['joined_year'] <= 2100): errors.append(f'{label}: joined_year must be a four-digit year or omitted')
                    if 'principal_investigator' in data and type(data['principal_investigator']) is not bool: errors.append(f'{label}: principal_investigator must be true or false')
                if 'date' in data: dt.date.fromisoformat(str(data['date'])[:10])
                for key in ['image','photo','pdf']:
                    value=data.get(key)
                    if value and not str(value).startswith(('https://','http://')) and not (ROOT/str(value).lstrip('/')).is_file(): errors.append(f'{label}: missing {key}: {value}')
            except (ValueError,TypeError,yaml.YAMLError) as exc: errors.append(f'{label}: {exc}')
    for path in (ROOT/'_research').glob('*.md'):
        data=yaml.safe_load(path.read_text().split('---',2)[1])
        for pub_id in data.get('publication_ids',[]):
            if pub_id.lower() not in ids: errors.append(f'{path.name}: unknown publication ID {pub_id}')
    people=yaml.safe_load((ROOT/'_data/people.yml').read_text())
    if people.get('sort_by') not in ('last_name','seniority','joined'):
        errors.append('people.yml: sort_by must be last_name, seniority, or joined')
    if type(people.get('show_alumni_photos')) is not bool:
        errors.append('people.yml: show_alumni_photos must be true or false (without quotes)')
    discovery=yaml.safe_load((ROOT/'_data/discovery_scene.yml').read_text())
    for key in ('enabled','show_contact_rings','twinkle_contact_rings'):
        if type(discovery.get(key)) is not bool: errors.append(f'discovery_scene.yml: {key} must be true or false')
    for key,lo,hi in [('cell_scale',0.4,1),('cell_opacity',0,1),('compound_size',0.1,0.5),('entry_distance',1.2,5),('contact_twinkle_period_seconds',1.5,20)]:
        value=discovery.get(key)
        if type(value) not in (int,float) or not math.isfinite(value) or not lo <= value <= hi:
            errors.append(f'discovery_scene.yml: {key} must be between {lo} and {hi}')
    for viewport in ('desktop','mobile'):
        timing=discovery.get(viewport,{})
        try:
            if not 0 <= timing['end'] < timing['start'] <= 1: raise ValueError()
        except (KeyError,TypeError,ValueError): errors.append(f'discovery_scene.yml: {viewport} requires 0 <= end < start <= 1')
    for index,compound in enumerate(discovery.get('compounds',[])):
        target=compound.get('target',[])
        if len(target)!=2 or not all(type(v) in (int,float) and math.isfinite(v) and -0.5 <= v <= 0.5 for v in target):
            errors.append(f'discovery_scene.yml compound {index}: target requires two numbers between -0.5 and 0.5')
        if not compound.get('image') and compound.get('sprite') not in [[x,y] for x in range(3) for y in range(2)]:
            errors.append(f'discovery_scene.yml compound {index}: sprite must identify a cell in the 3 by 2 sheet')
        image=compound.get('image') or discovery.get('image','')
        if not image or not (ROOT/str(image).lstrip('/')).is_file():
            errors.append(f'discovery_scene.yml compound {index}: missing image {image}')
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
