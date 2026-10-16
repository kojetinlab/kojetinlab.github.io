#!/usr/bin/env python3
"""Check built HTML links, asset references, fragments, and subpath compatibility."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
import sys
class Page(HTMLParser):
    def __init__(self): super().__init__(); self.links=[]; self.ids=set(); self.h1=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.add(a['id'])
        if tag=='h1':self.h1+=1
        for key in ['href','src','data-source']:
            if key in a:self.links.append((tag,a[key]))
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);p.add_argument('--baseurl',default='');args=p.parse_args()
    root=args.directory.resolve();pages={};errors=[]
    for path in root.rglob('*.html'):
        page=Page();page.feed(path.read_text(encoding='utf-8'));pages[path]=page
        if page.h1!=1:errors.append(f'{path.relative_to(root)}: expected one H1, found {page.h1}')
    if not pages:errors.append('No built HTML pages found; run Jekyll successfully before checking.')
    for path,page in pages.items():
        for tag,href in page.links:
            if not href: errors.append(f'{path.relative_to(root)}: empty {tag} URL');continue
            parsed=urlsplit(href)
            if parsed.scheme or parsed.netloc:continue
            rel=unquote(parsed.path)
            if rel.startswith('/'):
                if args.baseurl and not (rel==args.baseurl or rel.startswith(args.baseurl+'/')):errors.append(f'{path.relative_to(root)}: bypasses baseurl: {href}');continue
                target=root/rel.removeprefix(args.baseurl).lstrip('/')
            elif rel:target=path.parent/rel
            else:target=path
            if target.is_dir():target/= 'index.html'
            target=target.resolve()
            if not target.exists():errors.append(f'{path.relative_to(root)}: missing target {href}')
            elif parsed.fragment and target in pages and unquote(parsed.fragment) not in pages[target].ids:errors.append(f'{path.relative_to(root)}: missing anchor {href}')
    for e in errors: print('ERROR:',e)
    print(f'Checked {len(pages)} HTML pages; {len(errors)} broken internal references or structural errors.')
    return bool(errors)
if __name__=='__main__':sys.exit(main())
