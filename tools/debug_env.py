import sys, os
print('EXE:', sys.executable)
print('CWD:', os.getcwd())
print('FILES:', ', '.join(sorted(os.listdir('.'))))
