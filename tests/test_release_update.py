"""Exercise real rsync transfers in disposable Git repositories."""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


@unittest.skipUnless(shutil.which("git") and shutil.which("rsync"), "git and rsync are required")
class ReleaseUpdateTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="kojetin-update-test-")
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / "new release with spaces"
        self.repo = Path(self.temp.name) / "GitHub clone with spaces"
        self.source.mkdir()
        self.repo.mkdir()
        initial = {
            "Gemfile": "source 'https://rubygems.org'\n",
            "_config.yml": "asset_version: 11\n",
            "_layouts/home.html": "old home\n",
            "assets/js/molecular-viewer.js": "old code\n",
            "assets/js/vendor/molstar.js": "bundled viewer\n",
            "_data/display.yml": "site_palette: vandy\n",
            "_data/openings.yml": "openings: []\n",
            "README.md": "old guide\n",
            "package.json": '{"version":"5.7.0"}\n',
        }
        for name, value in initial.items():
            self.put(self.source, name, value)
            self.put(self.repo, name, value)
        self.put(self.source, "scripts/release-baselines/v5.7.json", json.dumps({
            "format": 1, "version": "5.7.0",
            "files": {n: hashlib.sha256(v.encode()).hexdigest() for n, v in initial.items()},
        }))
        for name in ("update-site.sh", "scripts/update_from_release.py"):
            self.put(self.source, name, (ROOT / name).read_text())
        self.put(self.source, "package.json", '{"version":"5.8.1"}\n')
        self.put(self.source, "_layouts/home.html", "new cell view\n")
        self.put(self.source, "assets/images/science/cell.txt", "new image\n")
        self.put(self.source, "assets/js/vendor/molstar.js", "updated bundled viewer\n")
        for name in ("_site/index.html", "node_modules/tool.txt", "vendor/gem.txt", "preview/index.html"):
            self.put(self.source, name, "generated download content\n")
            self.put(self.repo, name, "local build/dependency\n")
        subprocess.run(["git", "init", "-q", str(self.repo)], check=True, capture_output=True)
        self.git_head = (self.repo / ".git/HEAD").read_bytes()

    @staticmethod
    def put(root, name, value):
        file = root / name
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_text(value)

    def run_update(self, *args):
        return subprocess.run(["bash", str(self.source / "update-site.sh"), *args],
                              cwd=self.repo, text=True, capture_output=True)

    def assert_ok(self, result):
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_preview_apply_preservation_and_repeat(self):
        self.put(self.repo, "_data/display.yml", "site_palette: colorblind\n")
        self.put(self.repo, "my-notes.txt", "keep me\n")
        unchanged_time = (self.repo / "Gemfile").stat().st_mtime_ns
        before = {p.relative_to(self.repo): p.read_bytes() for p in self.repo.rglob("*") if p.is_file()}
        self.assert_ok(self.run_update())
        self.assertEqual(before, {p.relative_to(self.repo): p.read_bytes() for p in self.repo.rglob("*") if p.is_file()})
        self.assert_ok(self.run_update("--apply"))
        self.assertEqual((self.repo / "_layouts/home.html").read_text(), "new cell view\n")
        self.assertEqual((self.repo / "_data/display.yml").read_text(), "site_palette: colorblind\n")
        self.assertEqual((self.repo / "my-notes.txt").read_text(), "keep me\n")
        self.assertEqual((self.repo / "assets/js/vendor/molstar.js").read_text(), "updated bundled viewer\n")
        for name in ("_site/index.html", "node_modules/tool.txt", "vendor/gem.txt", "preview/index.html"):
            self.assertEqual((self.repo / name).read_text(), "local build/dependency\n")
        self.assertEqual((self.repo / ".git/HEAD").read_bytes(), self.git_head)
        self.assertEqual((self.repo / "Gemfile").stat().st_mtime_ns, unchanged_time)
        manifest_time = (self.repo / ".site-release.json").stat().st_mtime_ns
        again = self.run_update("--apply")
        self.assert_ok(again)
        self.assertIn("files to copy: 0", again.stdout)
        self.assertEqual((self.repo / ".site-release.json").stat().st_mtime_ns, manifest_time)

    def test_conflict_stops_all_copies_and_can_keep_merged_file(self):
        self.put(self.repo, "_layouts/home.html", "my customized homepage\n")
        result = self.run_update("--apply")
        self.assertEqual(result.returncode, 2, result.stdout + result.stderr)
        self.assertFalse((self.repo / "assets/images/science/cell.txt").exists())
        self.assertFalse((self.repo / ".site-release.json").exists())
        self.put(self.repo, "_layouts/home.html", "new cell view plus my custom content\n")
        self.assert_ok(self.run_update("--apply", "--keep-local", "_layouts/home.html"))
        self.assertEqual((self.repo / "_layouts/home.html").read_text(), "new cell view plus my custom content\n")

    def test_later_release_and_deletions(self):
        self.assert_ok(self.run_update("--apply"))
        self.put(self.repo, "_data/display.yml", "my saved settings\n")
        (self.repo / "_data/openings.yml").unlink()
        (self.source / "README.md").unlink()
        self.put(self.source, "_layouts/home.html", "next homepage\n")
        self.put(self.source, "package.json", '{"version":"5.9.0"}\n')
        self.assert_ok(self.run_update("--apply"))
        self.assertEqual((self.repo / "_layouts/home.html").read_text(), "next homepage\n")
        self.assertEqual((self.repo / "_data/display.yml").read_text(), "my saved settings\n")
        self.assertFalse((self.repo / "_data/openings.yml").exists())
        self.assertTrue((self.repo / "README.md").exists())
        self.assertEqual(json.loads((self.repo / ".site-release.json").read_text())["version"], "5.9.0")

    def test_new_file_collision(self):
        self.put(self.repo, "assets/images/science/cell.txt", "my unrelated image\n")
        self.assertEqual(self.run_update("--apply").returncode, 2)
        self.assertEqual((self.repo / "_layouts/home.html").read_text(), "old home\n")

    def test_source_manifest_and_symlink_protection(self):
        self.assert_ok(self.run_update("--make-manifest"))
        self.put(self.source, "_layouts/home.html", "edited downloaded source\n")
        self.assertNotEqual(self.run_update("--apply").returncode, 0)
        self.assertEqual((self.repo / "_layouts/home.html").read_text(), "old home\n")
        self.assert_ok(self.run_update("--make-manifest"))
        outside = Path(self.temp.name) / "outside.txt"
        outside.write_text("outside content\n")
        (self.repo / "_layouts/home.html").unlink()
        (self.repo / "_layouts/home.html").symlink_to(outside)
        self.assertNotEqual(self.run_update("--apply").returncode, 0)
        self.assertEqual(outside.read_text(), "outside content\n")


if __name__ == "__main__":
    unittest.main()
