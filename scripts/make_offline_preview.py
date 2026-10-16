#!/usr/bin/env python3
"""Package built pages and shared assets once into a server-free review HTML.

Edit the Jekyll source, not this generated file. Build with an empty baseurl.
The iframe shares embedded assets and preferences with the outer review page.
"""
import argparse
import base64
import json
import mimetypes
from pathlib import Path
import re


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('build', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    root = args.build.resolve()
    pages, assets = {}, {}
    suffixes = {'.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif', '.css', '.js', '.json', '.pdf'}
    for file in (root / 'assets').rglob('*'):
        if not file.is_file() or file.suffix.lower() not in suffixes:
            continue
        key = '/' + file.relative_to(root).as_posix()
        if file.suffix in {'.css', '.js', '.json'}:
            assets[key] = file.read_text(encoding='utf-8')
        else:
            mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
            assets[key] = f'data:{mime};base64,' + base64.b64encode(file.read_bytes()).decode()
    for file in root.rglob('*.html'):
        relative = file.relative_to(root).as_posix()
        route = '/' + relative.removesuffix('index.html') if relative.endswith('index.html') else '/' + relative
        html = file.read_text(encoding='utf-8')
        html = re.sub(r'<meta http-equiv="refresh"[^>]*>', '', html)
        bootstrap = '''<script>
window.KojetinPreviewAssets = parent.previewAssets;
window.KojetinPreviewState = parent.previewState;
</script>'''
        html = html.replace('<head>', '<head>' + bootstrap)
        html = html.replace('</body>', '''<script>
document.addEventListener('click', function (event) {
  const link = event.target.closest('a');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href) return;
  if (href.startsWith('/') && !href.startsWith('//')) {
    if (window.KojetinPreviewAssets[href]?.startsWith('data:')) {
      link.href = window.KojetinPreviewAssets[href];
      link.download = href.split('/').pop();
      return;
    }
    event.preventDefault();
    parent.postMessage({ previewRoute: href }, '*');
  } else if (href.startsWith('http')) {
    link.target = '_blank'; link.rel = 'noopener';
  }
});
</script></body>''')
        pages[route] = html
    payload = json.dumps({'pages': pages, 'assets': assets}, ensure_ascii=False).replace('</', '<\\/')
    result = '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Kojetin Laboratory · v5.7 molecular wiggle</title>
  <style>
    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #f7f7f2; }
    iframe { border: 0; width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>
  <iframe title="Kojetin Laboratory website preview v5.7" id="site"></iframe>
  <script type="application/json" id="preview-data">''' + payload + r'''</script>
  <script>
    const data = JSON.parse(document.getElementById('preview-data').textContent);
    const frame = document.getElementById('site');
    window.previewAssets = data.assets;
    window.previewState = {};

    function show() {
      const requested = decodeURIComponent(location.hash.slice(1) || '/');
      const [route, anchor] = requested.split('#');
      let html = data.pages[route] || data.pages['/404.html'];
      html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g,
        (all, path) => data.assets[path.split('?')[0]] ? '<style>' + data.assets[path.split('?')[0]] + '</style>' : all);
      html = html.replace(/<script([^>]*?)\bsrc="([^"]+)"[^>]*><\/script>/g,
        (all, attributes, path) => {
          path = path.split('?')[0];
          if (!data.assets[path]) return all;
          const code = data.assets[path].replace(/<\/script/gi, '<\\/script');
          const run = attributes.includes('defer')
            ? 'document.addEventListener("DOMContentLoaded", function () {' + code + '\n});'
            : code;
          return '<script>' + run + '<\/script>';
        });
      html = html.replace(/(src|href)="(\/assets\/[^\"]+)"/g,
        (all, attribute, path) => data.assets[path]?.startsWith('data:')
          ? attribute + '="' + data.assets[path] + '"' : all);
      frame.onload = () => {
        if (anchor) frame.contentDocument.getElementById(anchor)?.scrollIntoView();
      };
      frame.srcdoc = html;
    }
    addEventListener('message', event => {
      if (event.source !== frame.contentWindow || !event.data?.previewRoute) return;
      location.hash = encodeURIComponent(event.data.previewRoute);
    });
    addEventListener('hashchange', show);
    show();
  </script>
</body>
</html>
'''
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(result, encoding='utf-8')
    print(f'Embedded {len(pages)} pages and {len(assets)} shared assets: {len(result.encode()):,} bytes.')


if __name__ == '__main__':
    main()
