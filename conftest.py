"""Root pytest configuration — single place for import paths.

Replaces the scattered `sys.path.insert(...)` hacks previously copied
into every backend/test module (Phase 0, Oct 6 cleanup).
Run from the repo root: `pytest`.
"""
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
for path in (ROOT, os.path.join(ROOT, "backend"), os.path.join(ROOT, "agent")):
    if path not in sys.path:
        sys.path.insert(0, path)
