@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
set "MATH_DIR=C:\Users\HomeTech PC\the-elevator\stake_engine_upload\math"

echo Running Limbo math verification...

where py >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Using Python Launcher...
    py -3 -m pip install --user -U zstandard
    py -3 "%SCRIPT_DIR%verify_limbo_math.py" --dir "%MATH_DIR%" > "%SCRIPT_DIR%verify_output.txt" 2>&1
) else (
    echo Using system Python...
    python -m pip install --user -U zstandard
    python "%SCRIPT_DIR%verify_limbo_math.py" --dir "%MATH_DIR%" > "%SCRIPT_DIR%verify_output.txt" 2>&1
)

if %ERRORLEVEL% EQU 0 (
    echo Verification completed successfully.
) else (
    echo Verification completed with errors.
)

echo Results saved to: "%SCRIPT_DIR%verify_output.txt"
echo Please check this file for detailed verification results.

pause
