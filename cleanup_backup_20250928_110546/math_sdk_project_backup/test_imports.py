import importlib
import sys

def test_imports():
    """Test importing various candidate modules and report results."""
    candidates = ["stakeengine", "math_sdk", "stake", "engine", "stakeengine_math_sdk"]
    results = []
    
    for name in candidates:
        try:
            module = importlib.import_module(name)
            # If import succeeds, get the file path
            file_path = getattr(module, '__file__', 'No __file__ attribute')
            results.append((name, file_path))
        except Exception as e:
            # If import fails, capture the error
            error_msg = f"ERROR: {type(e).__name__}: {str(e)}"
            results.append((name, error_msg))
    
    return results

if __name__ == "__main__":
    print("Testing imports for potential Stake Engine math packages...")
    results = test_imports()
    
    print("\nResults:")
    for name, result in results:
        print(f"  {name}: {result}")
    
    # Check if any imports succeeded
    successful = [name for name, result in results if not result.startswith("ERROR")]
    if successful:
        print(f"\nSuccessful imports: {', '.join(successful)}")
    else:
        print("\nNo packages were successfully imported.")
