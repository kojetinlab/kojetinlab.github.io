# Import a new website download

The `update-site.sh` script copies new and changed release files into your existing GitHub clone. It uses content hashes and rsync, leaves unrelated files in place, and never deletes files. Preview is the default on every run; `--apply` performs the copy. After a successful preview, the script prints the Up Arrow instructions for applying it. After copying, it prints the separate GitHub Desktop commit/push steps. You still review, commit, and push in GitHub Desktop.

Version 5.16.1 refreshes all 84 citations and abstracts from PubMed/bioRxiv: 2 unpublished preprints appear above 82 published papers. Individual pages show abstracts. The PMID importer creates complete Markdown records, and a new refresh command updates citation fields while retaining your figures, topics, summaries, bodies, and page URLs. It also includes the research-page `publication_ids` fix. It also delays chemical discovery until its fifth heading enters view, keeping the adipocyte full-size through the cellular-function section. Asset cache version is 32. Keep the extracted download and your GitHub clone in separate folders.

If you customized a publication file, the release updater may report a conflict because both copies changed. Preserve your local content and apply the citation snapshot with the metadata merge tool described in `docs/publication-management.md`. To resolve each conflicted publication file, use the new release's `refresh_publications.py` with `--snapshot` pointing to the new release's `scripts/publication-metadata.json` and `--out` pointing to your repository's `_publications` folder. Preview first, then add `--apply`. Rerun the release updater with `--keep-local _publications/FILENAME.md` for each merged file. The metadata merge preserves your publication edits outside bibliographic fields.

## For Doug's existing v5.15.2 copy

The outer download includes `APPLY-UPDATE.command`. Run it without arguments for a preview, then with `--apply` to install. It uses the existing local GitHub folder at `/Users/dkojetin/Documents/GitHub/kojetinlab.github.io`; `--repository /path/to/clone` can select a different clone.

This helper resolves the specific research-template, stylesheet and configuration conflicts found in the inspected local copy. It preserves the smaller wordmark subtitle, the edited discovery caption, and all other local content. Before copying, it verifies those files still match the inspected or already-resolved versions and runs the standard updater's conflict check. If you edit one of those files afterward, it stops rather than replace the new edit. No commit or push is performed. After installation, restart Jekyll; review, commit and push in GitHub Desktop. All 84 source abstracts are already included, so an additional metadata download is unnecessary.

## Standard import

1. Download and unzip **Kojetin-Lab-Website-v5.16.1.zip**. Open the extracted `kojetinlab-website` source folder; find `update-site.sh` at its top level.
2. In GitHub Desktop, select `kojetinlab.github.io`, choose the branch you normally publish, and use **Repository → Show in Finder**. If you have remote changes, fetch/pull them first.
3. Open Terminal. Type `cd `, including the trailing space, drag your **GitHub repository folder** into Terminal, and press Return.
4. Type `bash `, drag **update-site.sh from the extracted download** into Terminal, and press Return. This previews the update without changing repository files.
5. To apply that preview, press the Up Arrow to recall the command, add ` --apply` at the end, and press Return.
6. Review the changed files in GitHub Desktop, including `.site-release.json`. Commit with a summary such as `Refresh publications from PubMed and bioRxiv`, then **Push origin**.

The commands will resemble these; substitute your actual paths:

```sh
cd "/Users/your-name/Documents/GitHub/kojetinlab.github.io"
bash "/Users/your-name/Downloads/Kojetin-Lab-Website-v5.16.1/kojetinlab-website/update-site.sh"
bash "/Users/your-name/Downloads/Kojetin-Lab-Website-v5.16.1/kojetinlab-website/update-site.sh" --apply
```

The script copies itself and its supporting files into your repository during this first update. Nothing is committed or pushed by the script. The normal GitHub Pages workflow builds the site after you push.

## Future updates

Open Terminal in your GitHub clone, then use the installed script with the next extracted **source folder**:

```sh
bash update-site.sh "/path/to/new-download/kojetinlab-website"
bash update-site.sh "/path/to/new-download/kojetinlab-website" --apply
```

The first command previews; the second copies. Review, commit, and push as usual. Choose the folder containing `Gemfile`, `_config.yml`, and `_layouts`, rather than the outer ZIP folder or the standalone preview HTML.

## What happens to your edits?

Plain rsync compares the two current folders; it cannot tell which differences are your customizations. This wrapper also remembers the previous downloaded release.

| Situation | Result |
| --- | --- |
| The file contents are already identical | Leave the file untouched, regardless of timestamp |
| The release changed a file you have not edited | Copy the updated file |
| The release adds a new file | Add it, including any missing parent folders |
| You edited a file that the release did not change | Keep your version, whether committed or uncommitted |
| Both you and the release changed the same file | List the conflict and stop before copying any files |
| You added an unrelated file | Keep it |
| The new release omits an older file | Keep it and list it; removals are always manual |

Conflict detection is at the **whole-file** level. It does not automatically merge different lines in the same file.

If a conflict appears, compare your file with the download and edit your repository copy to combine the changes you want. Then tell the updater to keep that resolved file:

```sh
bash update-site.sh "/path/to/new-download/kojetinlab-website" --keep-local _config.yml
bash update-site.sh "/path/to/new-download/kojetinlab-website" --keep-local _config.yml --apply
```

During first use, use the downloaded script's full path instead of `update-site.sh`. Repeat `--keep-local path/to/file` for each resolved file. This option deliberately keeps the whole local file; merge the wanted incoming changes into it first. For example, when preserving custom `_config.yml` settings, also incorporate the new `asset_version` and added exclusions.

Alternatively, if you want the downloaded file exactly, copy that individual file over your local version, then rerun the updater. It will recognize the identical contents.

The hidden `.site-release.json` file records hashes of the last imported release. **Include it in your commit** so subsequent updates and cloned copies can identify your edits. It is excluded from the published site. The first import uses the supplied exact v5.7 baseline when this file does not yet exist; a v5.8 copy already matching incoming files is also recognized. Versions older than v5.7 are outside this bootstrap workflow.

## Tools and exclusions

The script requires Bash, Git, rsync, and **Python 3.9 or later**, with no additional Python packages. Check with `python3 --version`. If Python is missing, install Python 3 from [python.org](https://www.python.org/downloads/macos/), reopen Terminal, and retry. Ruby and Jekyll are not needed to copy an update.

The updater excludes Git metadata, generated `_site*` folders, caches, local dependencies (`node_modules/`, root `vendor/`, `.bundle/`, `.venv/`), preview/output folders, ZIPs, and Python cache files. The nested **`assets/js/vendor/` is included** because the website needs its Mol* bundle. Symlinked source or destination file paths are refused; ordinary files and folders are supported.

An interrupted rsync copy may leave some files updated. The release baseline advances only after all selected copies verify. Rerun the same command to finish; already copied files will be recognized. The script does not run rsync with `--delete`.

## For preparing future source packages

After all source and documentation changes are complete, regenerate the incoming release manifest before making the ZIP:

```sh
python3 scripts/update_from_release.py --make-manifest
```

Include `.site-release.json`, `update-site.sh`, the helper, and `scripts/release-baselines/v5.7.json` in the source package. The importer verifies the incoming manifest when present. Do not regenerate the manifest in a customized GitHub clone as a routine update step: it represents the downloaded release, not your local edits.

Run the transfer tests with:

```sh
python3 -m unittest discover -s tests -p test_release_update.py -v
```
