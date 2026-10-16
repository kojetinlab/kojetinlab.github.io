# Local development on a Mac

Use a local Jekyll server to see saved edits immediately, before publishing them. GitHub Pages also builds on GitHub's servers, so this local setup is optional for publishing.

## Install Ruby once

This project uses Ruby **3.4.8** and Bundler **2.6.9**. If you already manage Ruby yourself and `ruby -v` shows the required version, skip to the next section.

These steps use the tools recommended in [Jekyll's macOS installation guide](https://jekyllrb.com/docs/installation/macos/).

1. Open **Terminal** from Applications → Utilities.
2. If Homebrew is not installed, follow the installation instructions at [brew.sh](https://brew.sh/). Complete the “Next steps” it prints so `brew` works in Terminal.
3. Install the Ruby tools and this project's Ruby version:

```sh
brew install chruby ruby-install
ruby-install ruby 3.4.8
```

Compilation can take several minutes. Follow any request to install Apple's command-line developer tools.

4. Activate that Ruby in the current Terminal window:

```sh
source "$(brew --prefix)/opt/chruby/share/chruby/chruby.sh"
chruby ruby-3.4.8
ruby -v
```

The final command should show Ruby 3.4.8. Repeat the two activation commands whenever you open a new Terminal window, or follow Jekyll's guide to make chruby activation automatic in your shell configuration. Use this Ruby installation for the commands below; do not use `sudo gem install` to alter the Ruby supplied with macOS.

## Open your working copy

Type `cd ` in Terminal, including the trailing space. Drag the cloned `kojetinlab.github.io` folder from Finder into Terminal, then press Return. The resulting command will resemble:

```sh
cd "/Users/your-name/Documents/GitHub/kojetinlab.github.io"
```

Use your actual folder location. You should be in the folder containing `Gemfile`, `README.md`, and `_config.yml`.

## Install dependencies and start the preview

Run these commands one at a time:

```sh
gem install bundler --version 2.6.9
bundle install
bundle exec jekyll serve --baseurl "" --livereload
```

Open **http://127.0.0.1:4000/** in your browser. Keep Terminal running while you work.

Edit the source in a plain-text/code editor. Saving templates, YAML settings, Markdown, or CSS triggers a rebuild and browser refresh. If it does not refresh, reload the tab and check Terminal for an error. Stop Jekyll with **Control-C**. After editing `_config.yml`, stop and restart it.

On later visits, activate Ruby, change into the working folder, and run just:

```sh
bundle exec jekyll serve --baseurl "" --livereload
```

Run `bundle install` again if `Gemfile` or `Gemfile.lock` changes.

## Explore safely

Start with `_data/display.yml` for defaults, `_data/structures.yml` for individual PDB cameras, and `_data/hero_animation.yml` for movement. YAML uses spaces for indentation; keep the existing indentation and avoid tabs.

Saved browser choices override YAML defaults. Use **Site defaults** in the arrow menu, or temporarily set `remember_choices: false` while editing. The browser-based dropdowns do not edit the YAML files.

Do not edit `_site/`: Jekyll regenerates it. The standalone HTML preview is also a snapshot; saving source files does not update that download.

When you like the result, review the changes in GitHub Desktop, commit, and push. Only a push to the repository's default branch publishes the change.

## Build without a live server

```sh
JEKYLL_ENV=production bundle exec jekyll build --baseurl ""
```

The generated website is written to `_site/`. You do not need to upload that directory; the GitHub Actions workflow builds it itself.

Python is optional for content checks and making a new standalone preview. With Python 3.10 or later:

```sh
python3 scripts/make_offline_preview.py _site ../Kojetin-Lab-Preview-v5.7.html
```

This writes the preview beside the source folder. Node.js and PyMOL are not required for routine editing or the Mol* viewer.
