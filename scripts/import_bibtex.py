#!/usr/bin/env python3
"""Compatibility command: python scripts/import_bibtex.py publications.bib"""
import sys
from add_publication import main
if __name__ == '__main__':
    sys.argv.insert(1,'--bibtex')
    sys.exit(main())
