# Molecular hero: scientific provenance and implementation

The default structure is **PDB 6ONJ**, a human PPARγ ligand-binding domain bound to rosiglitazone and a TRAP220/MED1 coactivator peptide. This is a Kojetin laboratory structure associated with Shang et al., *Nature Communications* (2020), DOI [10.1038/s41467-020-14750-x](https://doi.org/10.1038/s41467-020-14750-x), PMID [32075969](https://pubmed.ncbi.nlm.nih.gov/32075969/). The deposited experiment is X-ray crystallography at 2.30 Å resolution.

## Exact selection

Identifiers in the browser data use the deposited **author chain identifiers**. RCSB's mmCIF label chains differ for the peptide and ligand.

| Component | Author chain / residue | mmCIF label chain | Selected coordinates |
| --- | --- | --- | --- |
| PPARγ ligand-binding domain | A, deposited residues 203–477 | A | 258 modeled residues; 207–238, 245–262, 265–270, 276–477 |
| TRAP220/MED1 peptide | C, deposited residues 638–656 | B | 14 modeled residues, 638–651 |
| Rosiglitazone, CCD ID BRL | A, residue 501 | C | All 25 deposited heavy atoms and 27 CCD heavy-atom bonds |

The full peptide sequence in `SEQRES` is `NTKNHPMLMNLLKDNPAQD`. Only `NTKNHPMLMNLLKD` (638–651) has modeled coordinates. The five C-terminal residues are not drawn. The receptor's missing residues are 203–206, 239–244, 263–264 and 271–275. We neither interpolate through those missing stretches nor join the disconnected Cα segments. The uninterrupted stretches are smoothed for the display only.

**Biological assembly 1 is the receptor plus peptide, author chains A and C, with an identity transformation.** This is supported by the coordinate file's `REMARK 350` and RCSB assembly metadata. The “hetero 2-mer” assembly description counts the receptor and peptide as separate polymer entities; it does not mean that a second PPARγ receptor is present. The figure contains one receptor, one peptide and one ligand. Solvent, hydrogens, and any symmetry-generated crystal neighbors are omitted.

## Helix 12 and residue numbering

The highlighted H12/AF-2 region is author-chain A residues **466–477**. The actual deposited `HELIX` record AB5 assigns an α-helix only to **His466–Tyr473**. Residues 474–477 are the C-terminal extension and keep their deposited nonhelical secondary-structure label. A highlighted region is not a claim that all its residues are helical.

The 6ONJ PDB file's `DBREF` maps author numbering 203–477 to UniProt P37231 positions 231–505. The author numbering corresponds to the shorter PPARγ1 convention, 28 residues below the canonical PPARγ2 sequence used in that mapping. Thus author Tyr473 corresponds to canonical Tyr501. Labels and selections must consistently use author numbering for this asset. Do not transfer a residue range from a different isoform without checking the mapping.

## What moves, and what the animation means

The ligand and peptide are rigid groups derived from one experimentally determined static complex. Scroll-controlled translations make those components easier to see. They are an **illustrative exploded view**, not a molecular dynamics trajectory, measured dissociation pathway, binding order, or kinetic model. The receptor's individual helices remain connected as deposited; highlighting H12 does not assert a measured H12 transition. The chosen structure is an agonist/coactivator-bound state, even though the associated paper also reports other structures in repressive states.

All components share the same coordinate transformation: subtract the Cα centroid of the receptor, and round the resulting Ångström coordinates to 0.001 Å. No component is independently recentered. No minimization, docking, alternate conformation synthesis, or missing-residue modeling is performed. The browser and static poster choose a viewing orientation for clarity without changing internal atomic coordinates.

## Sources and regeneration

The source coordinate and chemical dictionary files are archived under `molecular-source/`. SHA-256 digests of the two generation inputs are recorded in the JSON.

- [6ONJ RCSB entry](https://www.rcsb.org/structure/6ONJ)
- [Original 6ONJ PDB coordinates](https://files.rcsb.org/download/6ONJ.pdb)
- [6ONJ biological assembly 1 metadata](https://data.rcsb.org/rest/v1/core/assembly/6ONJ/1)
- [6ONJ entry metadata](https://data.rcsb.org/rest/v1/core/entry/6ONJ)
- [BRL chemical component dictionary](https://files.rcsb.org/ligands/download/BRL.cif)
- [6ONJ structure DOI](https://doi.org/10.2210/pdb6ONJ/pdb)

From the repository root, run:

```sh
python3 scripts/prepare_molecule.py
```

The script uses PyYAML and the archived files. It writes `assets/molecular/6onj/data.json` and `assets/molecular/6onj/poster.svg`. No online service is required at build time or at page load. The script checks that the deposited assembly is A+C with the identity operation, the selected components are nonempty, and every CCD heavy-atom bond exactly agrees with the coordinate file's `CONECT` connectivity. Bond orders and aromatic flags come from the CCD, not distance guesses.

`ss` labels are taken directly from the coordinate file's `HELIX` and `SHEET` records: `H` means a deposited helix, `E` a deposited sheet strand, and `C` neither. The original helix class is retained in `secondaryStructure`; the simplified browser label groups α and 3₁₀ helices together. This is not a new DSSP assignment. Alternate conformers are restricted to blank or A labels; duplicate atom keys and hydrogen/deuterium records are excluded. The deposited coordinates include no alternative receptor conformations for this figure.

## JSON contract

`receptor` and `peptide` each contain:

- `label`, `authorChain`, `labelChain`, `sequence`, and `depositedResidueRange`;
- `residues`: author `resid`, three-letter `name`, `insertionCode`, Cα `xyz`, available backbone `atoms` keyed by `N`, `CA`, `C`, `O`, `ss`, and `h12`;
- `segments`: arrays of zero-based indices into `residues`, split at absent residues or a Cα separation greater than 4.5 Å;
- `heavyAtoms`: all selected deposited heavy atoms, including their original serial number, author residue ID, atom name, element, common-frame xyz, occupancy and B factor;
- `missingResidues`: deposited residue IDs without modeled Cα coordinates.

`ligand` contains `atoms` and `bonds`. Each bond has zero-based atom indices `a`, `b`, the CCD order (`SING` or `DOUB`) and an `aromatic` boolean. A renderer should not infer extra bonds or use an independent ligand origin. A ribbon can use the backbone carbonyl C–O vector for orientation. The static poster is a stylized Cα trace with thickness indicating secondary structure; it is not a solvent-accessible surface or electron-density map.

## Why 1FM6 was evaluated but not selected

[PDB 1FM6](https://www.rcsb.org/structure/1FM6), 2.10 Å resolution, is a useful alternative for a heterodimer story. It is associated with Gampe et al., *Molecular Cell* (2000), DOI [10.1016/S1097-2765(00)80448-7](https://doi.org/10.1016/S1097-2765(00)80448-7), PMID [10882139](https://pubmed.ncbi.nlm.nih.gov/10882139/).

Its asymmetric unit contains two copies of a PPARγ–RXRα complex, each with two coactivator peptides. The deposited biological assemblies distinguish those copies:

| Assembly | RXRα | PPARγ | Peptides | Ligands |
| --- | --- | --- | --- | --- |
| 1 | Author A | Author D | Author B and E | 9CR A501; BRL D503 |
| 2 | Author U | Author X | Author V and Y | 9CR U502; BRL X504 |

Here 9CR is 9-cis-retinoic acid and BRL is rosiglitazone. The full 25-residue peptide `SEQRES` sequence is `CPSSHSSLTERHKILHRLLQEGSPS` for B/E/V/Y. The author peptide numbering differs between the peptide copies. The legacy file also has historical `DBREF` mappings; a future 1FM6 implementation must verify current sequence mappings before creating labels. Displaying the complete asymmetric unit as one biological complex would incorrectly duplicate the receptor heterodimer.

6ONJ offers the requested receptor–ligand–peptide separation with fewer components, directly represents work from the Kojetin laboratory, and avoids conflating receptor heterodimer dissociation with ligand or peptide separation. The original 1FM6 coordinate file is retained only as a reference; it is not loaded by the homepage.

## Added 6ONI preset

[RCSB 6ONI](https://www.rcsb.org/structure/6ONI) is a 1.80 Å PPARγ/N-CoR/T0070907 structure. Author receptor chain B contains 261 observed Cα residues; N-CoR chain D contains 13, from the deposited range 2256–2278. EEY B 501 contains 18 observed heavy atoms and 19 CCD bonds between those atoms. The absent chlorine is not reconstructed. The deposited LINK record connects Cys285 SG to EEY C03 (1.79 Å). The preset disables ligand separation; the receptor cartoon and ligand sticks do not explicitly draw that cross-component bond. The two-chain biological assembly B+D uses the identity transform. Both original PDB and EEY dictionary are retained, and the generated JSON records their checksums.
