import importlib, inspect, sys
m = importlib.import_module('verify_limbo_math')
print(m.__file__)
with open(m.__file__, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        if i >= 40:
            break
        print(f"{i+1:03d}: ", line.rstrip())
