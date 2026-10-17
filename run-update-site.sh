#!/bin/bash
set -e

version="5.14.2"
release_dir="/Users/dkojetin/Downloads/Kojetin-Lab-Website-v${version}/kojetinlab-website"

cd "/Users/dkojetin/Documents/GitHub/kojetinlab.github.io"

cp "$release_dir/_config.yml" "./_config.yml"
bash "$release_dir/update-site.sh" --apply
