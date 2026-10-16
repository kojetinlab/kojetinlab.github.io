#!/usr/bin/env python3
"""Preview/apply a downloaded site release from inside your GitHub clone.

Compare content hashes with the last imported release, preserving local-only
changes. rsync copies only the selected files, without deleting anything.
No third-party Python packages are needed. Python 3.9+ is supported.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys
import tempfile

MANIFEST = ".site-release.json"
ROOT_EXCLUDES = {
    ".git", ".bundle", ".jekyll-cache", ".jekyll-metadata", ".venv",
    "node_modules", "vendor", "preview", "outputs", MANIFEST,
}
MARKERS = ("Gemfile", "_config.yml", "_layouts/home.html", "assets/js/molecular-viewer.js")


def included(name):
    """Exclude generated/local files, but retain nested assets/js/vendor/."""
    parts = PurePosixPath(name).parts
    return bool(parts) and not (
        parts[0] in ROOT_EXCLUDES or parts[0].startswith("_site")
        or any(p in {".git", "__pycache__", ".DS_Store"} for p in parts)
        or name.endswith((".pyc", ".zip"))
    )


def validate_name(name):
    parts = PurePosixPath(name).parts
    if (not name or name.startswith("/") or ".." in parts
            or "\\" in name or any(c in name for c in "\n\r\0")
            or not included(name) or str(PurePosixPath(name)) != name):
        raise ValueError("Invalid release path: " + repr(name))


def safe_path(root, name):
    """Do not follow a destination symlink while copying an update."""
    current = root
    for part in PurePosixPath(name).parts:
        current = current / part
        if current.is_symlink():
            raise ValueError("A file path uses a symlink: " + str(current))
    return current


def digest(file):
    if not file.exists():
        return None
    if not file.is_file():
        raise ValueError("Expected a regular file: " + str(file))
    sha = hashlib.sha256()
    with file.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            sha.update(block)
    return sha.hexdigest()


def inventory(root):
    files = {}
    for directory, dirs, names in os.walk(root, followlinks=False):
        parent = Path(directory)
        for name in list(dirs):
            child = parent / name
            relative = child.relative_to(root).as_posix()
            if not included(relative):
                dirs.remove(name)
            elif child.is_symlink():
                raise ValueError("Release directory uses a symlink: " + relative)
        for name in names:
            relative = (parent / name).relative_to(root).as_posix()
            if included(relative):
                validate_name(relative)
                files[relative] = digest(safe_path(root, relative))
    return dict(sorted(files.items()))


def read_manifest(path):
    if path.is_symlink():
        raise ValueError("Release manifest must be a regular file: " + str(path))
    data = json.loads(path.read_text())
    if data.get("format") != 1 or not isinstance(data.get("files"), dict):
        raise ValueError("Unrecognized release manifest: " + str(path))
    for name, value in data["files"].items():
        validate_name(name)
        if not isinstance(value, str) or len(value) != 64 or any(c not in "0123456789abcdef" for c in value):
            raise ValueError("Invalid file hash in " + str(path))
    return data


def write_manifest(root, data):
    safe_path(root, MANIFEST)
    encoded = json.dumps(data, indent=2, sort_keys=True) + "\n"
    if (root / MANIFEST).is_file() and (root / MANIFEST).read_text() == encoded:
        return
    # Replace only the updater's bookkeeping file, after every copy succeeds.
    with tempfile.NamedTemporaryFile(mode="w", dir=root, prefix=".site-release-", delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(encoded)
    try:
        os.replace(temporary, root / MANIFEST)
    finally:
        temporary.unlink(missing_ok=True)


def run(args):
    source = Path(args.source).expanduser().resolve()
    if not all((source / name).is_file() for name in MARKERS):
        raise ValueError("Select the extracted kojetinlab-website source folder, containing Gemfile and _config.yml.")
    incoming = {
        "format": 1,
        "version": json.loads((source / "package.json").read_text())["version"],
        "files": inventory(source),
    }
    if args.make_manifest:
        write_manifest(source, incoming)
        print("Recorded release " + incoming["version"] + " in " + str(source / MANIFEST))
        return 0
    for tool in ("git", "rsync"):
        if not shutil.which(tool):
            raise ValueError("Required program is unavailable: " + tool)
    result = subprocess.run(["git", "rev-parse", "--show-toplevel"], capture_output=True, text=True)
    if result.returncode:
        raise ValueError("First use cd to enter your local kojetinlab.github.io Git repository, then run the updater.")
    destination = Path(result.stdout.strip()).resolve()
    if source == destination or source in destination.parents or destination in source.parents:
        raise ValueError("Keep the extracted release and GitHub clone in separate folders; neither can contain the other.")
    if not all((destination / name).is_file() for name in MARKERS):
        raise ValueError("The current Git repository does not look like the Kojetin Jekyll website.")
    # New packages contain a manifest. Older v5.8 downloads can still be imported.
    if (source / MANIFEST).exists() and read_manifest(source / MANIFEST) != incoming:
        raise ValueError("The downloaded source differs from its release manifest. Use an unedited extracted download.")
    if (destination / MANIFEST).exists():
        baseline = read_manifest(destination / MANIFEST)
    else:
        # v5.7 predated the updater. Its exact published file hashes are bundled.
        bootstrap = Path(__file__).resolve().parent / "release-baselines" / "v5.7.json"
        baseline = read_manifest(bootstrap)
    keep = set(args.keep_local)
    for name in keep:
        validate_name(name)
        if name not in incoming["files"]:
            raise ValueError("--keep-local path is not in this release: " + name)
    changed, preserved, conflicts, already = [], [], [], 0
    old = baseline["files"]
    for name, new_hash in incoming["files"].items():
        local_hash = digest(safe_path(destination, name))
        if local_hash == new_hash:
            already += 1
        elif name in keep or new_hash == old.get(name):
            # The release has not changed this file, or the user chose their edit.
            preserved.append(name)
        elif local_hash == old.get(name):
            changed.append(name)
        else:
            conflicts.append(name)
    retained = sorted(name for name in old if name not in incoming["files"] and (destination / name).exists())
    print("Source:      " + str(source))
    print("Repository:  " + str(destination))
    print("Release:     " + str(baseline["version"]) + " -> " + str(incoming["version"]))
    print("Mode:        " + ("APPLY" if args.apply else "PREVIEW (no files will change)"))
    for title, names in (("Copy new/changed files", changed), ("Preserve your edits", preserved),
                         ("Keep files omitted from the release", retained), ("Conflicts: both copies changed", conflicts)):
        if names:
            print("\n" + title + ":")
            for name in names:
                print("  " + name)
    print("\nAlready identical: " + str(already) + "; files to copy: " + str(len(changed)))
    if conflicts:
        print("No files were copied. Compare the listed files and merge the changes you want.")
        print("Then rerun with --keep-local 'path/to/file' for each file you resolved locally.")
        return 2
    # Check bookkeeping path before copying; no links or directories may occupy it.
    digest(safe_path(destination, MANIFEST))
    if changed:
        command = ["rsync", "-rt", "--checksum", "--itemize-changes", "--from0", "--files-from=-"]
        if not args.apply:
            command.append("--dry-run")
        command.extend(["--", str(source) + "/", str(destination) + "/"])
        sys.stdout.flush()
        subprocess.run(command, input=("\0".join(changed) + "\0").encode(), check=True)
    if args.apply:
        # Detect a partial copy before advancing the baseline; a rerun is safe.
        for name in changed:
            if digest(safe_path(destination, name)) != incoming["files"][name]:
                raise ValueError("Copied file did not verify: " + name + ". The release baseline was not advanced.")
        write_manifest(destination, incoming)
        print("\nUpdate copied to your local repository. Nothing has been committed or pushed.")
        print("Next: open GitHub Desktop, review Changes, enter a summary, and click Commit.")
        print("Then click Push origin to send the commit to GitHub and start the website build.")
    else:
        print("\nPreview complete. No repository files were changed.")
        print("To copy this update: press Up Arrow to recall that command,")
        print("add a space followed by --apply at the end, and press Return.")
        print("This preview/apply workflow works for every update, not just the first run.")
        print("--apply copies files; committing and pushing are separate steps in GitHub Desktop.")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", nargs="?", default=str(Path(__file__).resolve().parent.parent),
                        help="extracted release folder; defaults to the folder containing this updater")
    parser.add_argument("--apply", action="store_true", help="copy the update; without this flag, preview only")
    parser.add_argument("--keep-local", action="append", default=[], metavar="PATH",
                        help="preserve one resolved/custom file; repeat for several paths")
    parser.add_argument("--make-manifest", action="store_true", help="maintainer: record an unpacked release before packaging")
    try:
        return run(parser.parse_args())
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as error:
        print("Update stopped: " + str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
