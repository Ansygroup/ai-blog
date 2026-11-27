#!/usr/bin/env python3
"""Derive a 'Bottom line' answer box from an article's own verdict section.

Takes the last H2 section that is not the FAQ, extracts its first paragraph,
caps it at ~2 sentences / 300 chars. The text is the article's own words, so
the box never claims anything the article doesn't say. Returns '' on failure.
"""
import re

SKIP_HEADS = ('frequently asked questions', 'faq', 'sources', 'references')


def derive_bottom_line(body: str) -> str:
    sections = re.split(r'\n(?=## )', body)
    verdict = ''
    for sec in reversed(sections):
        head = sec.split('\n', 1)[0].strip().lower().strip('# ')
        if not sec.startswith('## ') or any(h in head for h in SKIP_HEADS):
            continue
        # first non-empty paragraph under the heading
        paras = [p.strip() for p in sec.split('\n\n')[1:] if p.strip() and not p.strip().startswith(('#', '|', '-', '>'))]
        paras = [p for p in paras if len(re.sub(r'^[0-9]+\.\s*', '', p)) >= 40]
        if paras:
            verdict = re.sub(r'^[0-9]+\.\s*', '', paras[0])
            break
    if not verdict:
        return ''
    verdict = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', verdict)  # strip md links
    verdict = re.sub(r'[*_`>]', '', verdict).strip()
    sentences = re.split(r'(?<=[.!?]) ', verdict)
    out = ''
    for s in sentences:
        if out and len(out) + len(s) > 300:
            break
        out = (out + ' ' + s).strip()
        if len(sentences) > 1 and out.count('.') + out.count('!') + out.count('?') >= 2:
            break
    return out if len(out) >= 40 else ''
