import sys
import pkgutil
import importlib
from pathlib import Path

def explore_stakeengine():
    """
    Attempts to import stakeengine and list its submodules.
    If import fails, prints the exception.
    """
    print("Attempting to import stakeengine...")
    
    try:
        # Try to import stakeengine
        import stakeengine
        
        # Print package file location
        print(f"stakeengine package location: {getattr(stakeengine, '__file__', 'No __file__ attribute')}")
        print(f"stakeengine package path: {getattr(stakeengine, '__path__', 'No __path__ attribute')}")
        
        # List all submodules
        print("\nSubmodules in stakeengine:")
        for finder, name, ispkg in pkgutil.walk_packages(stakeengine.__path__, prefix="stakeengine."):
            print(f"  {'[Package]' if ispkg else '[Module]'} {name}")
            
            # Try importing each submodule to see what's available
            try:
                module = importlib.import_module(name)
                if hasattr(module, "__file__"):
                    print(f"    - Location: {module.__file__}")
            except Exception as e:
                print(f"    - Error importing: {type(e).__name__}: {str(e)}")
    
    except Exception as e:
        print(f"Failed to import stakeengine: {type(e).__name__}: {str(e)}")
        
        # Check if the package is in site-packages
        site_packages = [p for p in sys.path if "site-packages" in str(p)]
        for sp in site_packages:
            sp_path = Path(sp)
            stakeengine_candidates = list(sp_path.glob("*stakeengine*"))
            if stakeengine_candidates:
                print("\nFound potential stakeengine files in site-packages:")
                for candidate in stakeengine_candidates:
                    print(f"  {candidate}")
        
        # Check if there's a src directory in sys.path
        src_dirs = [p for p in sys.path if "src" in str(p)]
        for src in src_dirs:
            src_path = Path(src)
            stakeengine_candidates = list(src_path.glob("*stakeengine*"))
            if stakeengine_candidates:
                print("\nFound potential stakeengine files in src directories:")
                for candidate in stakeengine_candidates:
                    print(f"  {candidate}")
    
    # Print Python path for debugging
    print("\nPython sys.path:")
    for i, path in enumerate(sys.path):
        print(f"  {i}: {path}")

if __name__ == "__main__":
    explore_stakeengine()
