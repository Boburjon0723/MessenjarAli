import re, os, glob

with open('src/lib/translations.ts', 'r', encoding='utf-8') as f:
    tr = f.read()

keys = set(re.findall(r'^\s+(\w+):', tr, re.M))

for fp in glob.glob('src/**/*.tsx', recursive=True) + glob.glob('src/**/*.ts', recursive=True):
    if 'translations.ts' in fp or 'node_modules' in fp:
        continue
    with open(fp, 'r', encoding='utf-8') as f:
        c = f.read()
    for m in re.finditer(r"t\('([^']+)'\)", c):
        k = m.group(1)
        if k not in keys:
            line = c[:m.start()].count('\n') + 1
            print(f'{fp}:{line} => missing key: {k}')
