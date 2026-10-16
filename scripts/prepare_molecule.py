#!/usr/bin/env python3
"""Derive browser assets from deposited coordinates using _data/structures.yml.

Run from any directory: python3 scripts/prepare_molecule.py
Input files are archived in molecular-source/. No network, fitting, gap filling,
energy minimization, or chemical bond inference is performed.
"""
from pathlib import Path
from collections import OrderedDict
import hashlib
import json
import math
import re
import shlex
import argparse
import yaml

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "molecular-source"
OUT = ROOT / "assets" / "molecular"

def sub(a, b): return [x-y for x,y in zip(a,b)]
def add(a, b): return [x+y for x,y in zip(a,b)]
def mul(a, s): return [x*s for x in a]
def dot(a, b): return sum(x*y for x,y in zip(a,b))
def cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def norm(a): return mul(a,1/math.sqrt(dot(a,a)))
def mean(points): return [sum(p[i] for p in points)/len(points) for i in range(3)]
def xyz_round(a): return [round(v,3) for v in a]

def read_bonds(path, atoms):
    """Read _chem_comp_bond rows without inferring bonds from distances."""
    lines=path.read_text().splitlines()
    headers=[]; rows=[]; in_bonds=False
    for line in lines:
        if line.startswith('_chem_comp_bond.'):
            in_bonds=True; headers.append(line.strip()); continue
        if in_bonds:
            if line.startswith('#') or line.startswith('loop_'): break
            if line.strip(): rows.append(shlex.split(line))
    lookup={a['name']:i for i,a in enumerate(atoms)}
    result=[]
    for values in rows:
        row=dict(zip(headers,values))
        a=row['_chem_comp_bond.atom_id_1']; b=row['_chem_comp_bond.atom_id_2']
        if a not in lookup or b not in lookup: continue # Keep only bonds between deposited atoms; do not reconstruct missing atoms.
        result.append({'a':lookup[a], 'b':lookup[b],
                       'order':row['_chem_comp_bond.value_order'],
                       'aromatic':row['_chem_comp_bond.pdbx_aromatic_flag']=='Y'})
    assert result, "No dictionary bonds matched the selected ligand"
    return result

def prepare(key='6onj'):
    config=yaml.safe_load((ROOT/'_data/structures.yml').read_text())[key]
    pdb_id=config['pdb_id']; ccd=config['ligand_ccd']
    receptor_chain=config['receptor_chain']; peptide_chain=config['peptide_chain']
    pdb_path=SOURCE/f'{pdb_id}.pdb' 
    lines=pdb_path.read_text().splitlines()
    # Check the selected two-chain assembly uses the identity operation.
    assert any(f'APPLY THE FOLLOWING TO CHAINS: {receptor_chain}, {peptide_chain}' in l for l in lines), 'This preparation supports identity assemblies of the two selected chains' 
    biomt=[l for l in lines if l.startswith('REMARK 350   BIOMT')]
    assert len(biomt)==3 and all(float(l.split()[-1])==0 for l in biomt)
    for row,line in enumerate(biomt):
        assert list(map(float,line.split()[4:7]))==[float(row==j) for j in range(3)]
    secondary=[]
    for l in lines:
        if l.startswith('HELIX '):
            secondary.append({'chain':l[19], 'start':int(l[21:25]), 'end':int(l[33:37]),
                              'ss':'H', 'id':l[11:14].strip(), 'helixClass':int(l[38:40])})
        elif l.startswith('SHEET '):
            secondary.append({'chain':l[21], 'start':int(l[22:26]), 'end':int(l[33:37]),
                              'ss':'E', 'id':l[11:14].strip()})
    atoms=[]; seen=set()
    for l in lines:
        if l[:6] not in ('ATOM  ','HETATM'): continue
        name=l[12:16].strip(); alt=l[16]; resname=l[17:20]; chain=l[21]
        if alt not in (' ','A'): continue
        element=l[76:78].strip()
        if element in ('H','D'): continue
        if not (l.startswith('ATOM') and chain in (receptor_chain,peptide_chain) or resname==ccd and chain==config['ligand_chain'] and int(l[22:26])==config['ligand_residue']): continue
        resid=int(l[22:26]); atom_key=(chain,resid,l[26],name)
        if atom_key in seen: continue
        seen.add(atom_key)
        atoms.append({'serial':int(l[6:11]), 'name':name,'element':element,'chain':chain,
                      'resid':resid,'resname':resname,'insertionCode':l[26].strip(),
                      'xyz':[float(l[30:38]),float(l[38:46]),float(l[46:54])],
                      'occupancy':float(l[54:60]),'bFactor':float(l[60:66])})
    origin=mean([a['xyz'] for a in atoms if a['name']=='CA' and a['chain']==receptor_chain])
    for a in atoms: a['xyz']=xyz_round(sub(a['xyz'],origin))
    def polymer(chain,label,sequence,deposited_range):
        rows=OrderedDict()
        chain_atoms=[a for a in atoms if a['chain']==chain and a['resname']!=ccd]
        for a in chain_atoms:
            k=(a['resid'],a['insertionCode'])
            rows.setdefault(k,{'resid':a['resid'],'name':a['resname'],
                               'insertionCode':a['insertionCode'],'atoms':{}})
            if a['name'] in ('N','CA','C','O'): rows[k]['atoms'][a['name']]=a['xyz']
        residues=[]
        for r in rows.values():
            if 'CA' not in r['atoms']: continue
            r['xyz']=r['atoms']['CA']; r['ss']='C'
            for s in secondary:
                if s['chain']==chain and s['start']<=r['resid']<=s['end']: r['ss']=s['ss']
            r['h12']=chain==receptor_chain and config['h12_range'][0]<=r['resid']<=config['h12_range'][1]
            residues.append(r)
        segments=[]
        for i,r in enumerate(residues):
            new=i==0 or r['resid']!=residues[i-1]['resid']+1 or math.dist(r['xyz'],residues[i-1]['xyz'])>4.5
            if new: segments.append([])
            segments[-1].append(i)
        observed={r['resid'] for r in residues}
        return {'label':label,'authorChain':chain,'labelChain':'A' if chain==receptor_chain else 'B',
                'sequence':sequence,'depositedResidueRange':deposited_range,
                'residues':residues,'segments':segments,'heavyAtoms':chain_atoms,
                'missingResidues':[i for i in range(deposited_range[0],deposited_range[1]+1) if i not in observed]}
    receptor_sequence=''.join(l[19:70].strip()+' ' for l in lines if l.startswith('SEQRES') and l[11]==receptor_chain).strip().split()
    one={'ALA':'A','ARG':'R','ASN':'N','ASP':'D','CYS':'C','GLN':'Q','GLU':'E','GLY':'G','HIS':'H','ILE':'I','LEU':'L','LYS':'K','MET':'M','PHE':'F','PRO':'P','SER':'S','THR':'T','TRP':'W','TYR':'Y','VAL':'V'}
    receptor=polymer(receptor_chain,config['receptor']+' ligand-binding domain',''.join(one.get(r,'X') for r in receptor_sequence),config['receptor_range'])
    peptide_sequence=''.join(one.get(res,'X') for l in lines if l.startswith('SEQRES') and l[11]==peptide_chain for res in l[19:70].split())
    peptide=polymer(peptide_chain,config['peptide']+' '+config['peptide_role'],peptide_sequence,config['peptide_range'])
    ligand_atoms=[a for a in atoms if a['resname']==ccd]
    ligand={'label':config['ligand'],'ccdId':ccd,'authorChain':config['ligand_chain'],'labelChain':'C','resid':config['ligand_residue'],
            'atoms':ligand_atoms,'bonds':read_bonds(SOURCE/f'{ccd}.cif',ligand_atoms),
            'bondSource':f'wwPDB Chemical Component Dictionary {ccd}'}
    # Check dictionary connectivity against deposition CONECT; no invented edges.
    serial_to_index={a['serial']:i for i,a in enumerate(ligand_atoms)}; deposited_edges=set()
    for l in lines:
        if not l.startswith('CONECT'): continue
        nums=[int(l[i:i+5]) for i in range(6,len(l),5) if l[i:i+5].strip()]
        if nums[0] not in serial_to_index: continue
        for b in nums[1:]:
            if b in serial_to_index: deposited_edges.add(tuple(sorted((serial_to_index[nums[0]],serial_to_index[b]))))
    assert deposited_edges=={tuple(sorted((b['a'],b['b']))) for b in ligand['bonds']}
    assert receptor['residues'] and peptide['residues'] and ligand_atoms
    result={'schemaVersion':1,'pdbId':pdb_id,'assemblyId':'1','units':'angstrom',
            'title':config['label'],
            'method':config['method'],'resolutionAngstrom':config['resolution'],
            'coordinateOrigin':xyz_round(origin),'coordinateTransform':'subtract receptor Cα centroid; no rotation',
            'receptor':receptor,'peptide':peptide,'ligand':ligand,'secondaryStructure':secondary,
            'sourceUrl':f'https://www.rcsb.org/structure/{pdb_id}',
            'coordinateUrl':f'https://files.rcsb.org/download/{pdb_id}.pdb',
            'publication':config.get('publication',{}),
            'sourceSha256':hashlib.sha256(pdb_path.read_bytes()).hexdigest(),
            'ccdSha256':hashlib.sha256((SOURCE/f'{ccd}.cif').read_bytes()).hexdigest(),
            'scientificNote':'Artistic separation of a deposited static complex; not a simulation of dissociation or an experimentally measured pathway.',
            'h12':{'authorResidueRange':config['h12_range'],
                   'note':'Highlight includes helix 12 and its C-terminal extension; ss follows deposited HELIX records.'}}
    OUT.mkdir(parents=True,exist_ok=True)
    target=OUT/key
    target.mkdir(parents=True,exist_ok=True)
    (target/'data.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
    make_poster(result, target)
    print(f'{pdb_id}: {len(receptor["residues"])} receptor + {len(peptide["residues"])} peptide residues; {len(ligand_atoms)} ligand atoms, {len(ligand["bonds"])} dictionary bonds.')
    print('Receptor segments:',[[receptor['residues'][s[0]]['resid'],receptor['residues'][s[-1]]['resid']] for s in receptor['segments']])
    print('Wrote',target)
    return result

def make_poster(data, target):
    """Static, accessible coordinate-derived ribbon view for no-JS/reduced motion."""
    receptor=data['receptor']; peptide=data['peptide']; ligand=data['ligand']
    colors=yaml.safe_load((ROOT/'_data/palettes.yml').read_text())['vandy']['molecule']
    config=ROOT/'_data'/'hero_animation.yml'
    if config.exists():
        # Read just these simple hex settings without a YAML dependency.
        for key in colors:
            match=re.search(r'^\s*'+re.escape(key)+r''':\s*['"]?(#[0-9a-fA-F]{6})''',config.read_text(),re.M)
            if match: colors[key]=match.group(1)
    front=norm(mean([a['xyz'] for a in ligand['atoms']]))
    pcenter=mean([r['xyz'] for r in peptide['residues']])
    up=norm(sub(pcenter,mul(front,dot(pcenter,front)))); right=norm(cross(up,front))
    # Roll modestly so the helix bundle fills the wide hero panel.
    angle=-.24; xaxis=add(mul(right,math.cos(angle)),mul(up,math.sin(angle)))
    yaxis=add(mul(up,math.cos(angle)),mul(right,-math.sin(angle)))
    def view(p): return [dot(p,xaxis),dot(p,yaxis),dot(p,front)]
    allpts=[view(r['xyz']) for g in (receptor,peptide) for r in g['residues']]
    xmin,xmax=min(p[0] for p in allpts),max(p[0] for p in allpts)
    ymin,ymax=min(p[1] for p in allpts),max(p[1] for p in allpts)
    scale=min(610/(xmax-xmin),520/(ymax-ymin)); xc=(xmin+xmax)/2; yc=(ymin+ymax)/2
    def project(p):
        v=view(p);return [400+(v[0]-xc)*scale,320-(v[1]-yc)*scale,v[2]]
    pieces=[]
    # Interpolate each deposited continuous Cα segment; orient ribbons from C–O.
    for group,base in ((receptor,colors['receptor_color']),(peptide,colors['peptide_color'])):
        for ids in group['segments']:
            rs=[group['residues'][i] for i in ids]
            for i in range(len(rs)-1):
                p0=rs[max(0,i-1)]['xyz']; p1=rs[i]['xyz']; p2=rs[i+1]['xyz']; p3=rs[min(len(rs)-1,i+2)]['xyz']
                points=[]
                for k in range(9):
                    t=k/8
                    v=[.5*((2*p1[d])+(-p0[d]+p2[d])*t+(2*p0[d]-5*p1[d]+4*p2[d]-p3[d])*t*t+(-p0[d]+3*p1[d]-3*p2[d]+p3[d])*t*t*t) for d in range(3)]
                    points.append(project(v))
                color=colors['helix12_color'] if rs[i]['h12'] else base
                width=(1.8 if rs[i]['ss'] in ('H','E') else .45)*scale
                path='M '+' L '.join(f'{p[0]:.2f},{p[1]:.2f}' for p in points)
                depth=sum(p[2] for p in points)/len(points)
                # Two strokes communicate ribbon relief without fabricating atoms.
                node=f'<path d="{path}" fill="none" stroke="#fffdf8" stroke-width="{width+1.8:.2f}" stroke-linecap="round"/><path d="{path}" fill="none" stroke="{color}" stroke-width="{width:.2f}" stroke-linecap="round"/><path d="{path}" fill="none" stroke="white" opacity=".13" stroke-width="{width*.30:.2f}" stroke-linecap="round"/>'
                pieces.append((depth,node))
    for bond in ligand['bonds']:
        a=project(ligand['atoms'][bond['a']]['xyz']);b=project(ligand['atoms'][bond['b']]['xyz'])
        n=2 if bond['order']=='DOUB' else 1; dx=b[0]-a[0];dy=b[1]-a[1];mag=math.hypot(dx,dy)
        for k in range(n):
            offset=(k-(n-1)/2)*3.6;ox=-dy/mag*offset;oy=dx/mag*offset
            pieces.append(((a[2]+b[2])/2+.1,f'<path d="M {a[0]+ox:.2f},{a[1]+oy:.2f} L {b[0]+ox:.2f},{b[1]+oy:.2f}" stroke="{colors["ligand_color"]}" stroke-width="3.6" stroke-linecap="round"/>'))
    palette={'C':colors['ligand_color'],'N':'#466aab','O':'#c96354','S':'#d7ad43'}
    for atom in ligand['atoms']:
        p=project(atom['xyz']);pieces.append((p[2]+.2,f'<circle cx="{p[0]:.2f}" cy="{p[1]:.2f}" r="4.0" fill="{palette.get(atom["element"],colors['ligand_color'])}"/>'))
    content=''.join(node for _,node in sorted(pieces,key=lambda pair:pair[0]))
    svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 640" role="img" aria-labelledby="title desc">
<title id="title">{data["title"]} — PDB {data["pdbId"]}</title>
<desc id="desc">Static view derived from deposited atomic coordinates of {data["pdbId"]}. Unresolved residues are omitted.</desc>
<defs><radialGradient id="bg"><stop stop-color="#e8eeea" stop-opacity=".8"/><stop offset="1" stop-color="#faf8f2" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="400" cy="330" rx="345" ry="290" fill="url(#bg)"/>{content}</svg>'''
    (target/'poster.svg').write_text(svg)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--structure',default='all')
    args=parser.parse_args()
    configs=yaml.safe_load((ROOT/'_data/structures.yml').read_text())
    for key in configs if args.structure=='all' else [args.structure]:
        prepare(key)
