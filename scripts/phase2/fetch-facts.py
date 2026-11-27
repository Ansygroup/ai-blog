#!/usr/bin/env python3
"""Fetch public vendor pages and extract verifiable fact snippets (prices, plan names,
feature keywords) into a fact sheet JSON. Articles must only quote numbers that appear here.

Usage: fetch-facts.py out.json tool=URL [tool=URL ...]
"""
import json, re, subprocess, sys, html

def fetch(url):
    r = subprocess.run(['curl', '-sL', '--max-time', '25', '-A',
                        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36', url],
                       capture_output=True, text=True)
    return r.stdout

def textify(raw):
    raw = re.sub(r'(?s)<script.*?</script>|<style.*?</style>', ' ', raw)
    raw = re.sub(r'(?s)<[^>]+>', ' ', raw)
    return re.sub(r'\s+', ' ', html.unescape(raw))

PRICE = re.compile(r'\$\s?\d+(?:\.\d{1,2})?(?:\s?/\s?(?:mo|month|user|seat|yr|year))?', re.I)
PLAN = re.compile(r'\b(Free|Starter|Basic|Pro(?:fessional)?|Plus|Premium|Team|Business|Enterprise|Creator|Unlimited)\s+(?:plan|tier)\b', re.I)

def extract(text):
    prices = sorted(set(m.group(0).replace(' ', '') for m in PRICE.finditer(text)))
    plans = sorted(set(m.group(1).capitalize() for m in PLAN.finditer(text)))
    return {'prices': prices[:12], 'plans': plans[:8]}

def main():
    out_path = sys.argv[1]
    facts = {}
    for arg in sys.argv[2:]:
        name, url = arg.split('=', 1)
        try:
            facts[name] = {'url': url, **extract(textify(fetch(url)))}
            print(name, len(facts[name]['prices']), 'prices,', len(facts[name]['plans']), 'plans')
        except Exception as e:
            facts[name] = {'url': url, 'error': str(e)}
            print(name, 'ERROR', e)
    json.dump(facts, open(out_path, 'w'), indent=2)

if __name__ == '__main__':
    main()
