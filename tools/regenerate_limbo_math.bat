@echo off
setlocal EnableDelayedExpansion

echo.
echo ===================================================
echo  Regenerating Limbo Math Package for Stake Engine
echo ===================================================
echo.

REM Set variables for paths
set "ROOT=C:\Users\HomeTech PC\the-elevator"
set "VENV_PY=C:\Users\HomeTech PC\the-elevator\math_sdk_project\env\Scripts\python.exe"
set "VENV_PIP=C:\Users\HomeTech PC\the-elevator\math_sdk_project\env\Scripts\pip.exe"
set "SDK_PATH=C:\Users\HomeTech PC\math-sdk"
set "PUBLISHER=C:\Users\HomeTech PC\the-elevator\math_sdk_project\run_publisher_limbo.py"
set "PUB_DIR=%ROOT%\library\publish_files\limbo_game"
set "UPLOAD_DIR=%ROOT%\stake_engine_upload\math"

REM Create timestamp for backup
for /f %%i in ('powershell -NoProfile -Command "(Get-Date).ToString('yyyyMMdd_HHmmss')"') do set TS=%%i
set "BACKUP_DIR=%ROOT%\backups\publish_backup_%TS%"

echo Creating backup directory: %BACKUP_DIR%
mkdir "%BACKUP_DIR%" 2>nul
mkdir "%BACKUP_DIR%\limbo_game" 2>nul
mkdir "%BACKUP_DIR%\upload_math" 2>nul

echo.
echo Backing up existing files...
if exist "%PUB_DIR%\index.json" copy /Y "%PUB_DIR%\index.json" "%BACKUP_DIR%\limbo_game\" >nul
if exist "%PUB_DIR%\lookup_table.csv" copy /Y "%PUB_DIR%\lookup_table.csv" "%BACKUP_DIR%\limbo_game\" >nul
if exist "%PUB_DIR%\game_logic.jsonl.zst" copy /Y "%PUB_DIR%\game_logic.jsonl.zst" "%BACKUP_DIR%\limbo_game\" >nul
if exist "%PUB_DIR%\index.json" del /Q "%PUB_DIR%\index.json"
if exist "%PUB_DIR%\lookup_table.csv" del /Q "%PUB_DIR%\lookup_table.csv"
if exist "%PUB_DIR%\game_logic.jsonl.zst" del /Q "%PUB_DIR%\game_logic.jsonl.zst"

if exist "%UPLOAD_DIR%\index.json" copy /Y "%UPLOAD_DIR%\index.json" "%BACKUP_DIR%\upload_math\" >nul
if exist "%UPLOAD_DIR%\lookup_table.csv" copy /Y "%UPLOAD_DIR%\lookup_table.csv" "%BACKUP_DIR%\upload_math\" >nul
if exist "%UPLOAD_DIR%\game_logic.jsonl.zst" copy /Y "%UPLOAD_DIR%\game_logic.jsonl.zst" "%BACKUP_DIR%\upload_math\" >nul
if exist "%UPLOAD_DIR%\index.json" del /Q "%UPLOAD_DIR%\index.json"
if exist "%UPLOAD_DIR%\lookup_table.csv" del /Q "%UPLOAD_DIR%\lookup_table.csv"
if exist "%UPLOAD_DIR%\game_logic.jsonl.zst" del /Q "%UPLOAD_DIR%\game_logic.jsonl.zst"

echo.
echo Installing SDK in virtual environment...
echo Upgrading pip...
"%VENV_PIP%" install --upgrade pip
echo Installing math-sdk in editable mode...

REM ------------------------------------------------------------------
REM Decide which path inside math-sdk should be installed in editable mode
REM Priority:
REM   1) SDK root if it contains pyproject.toml or setup.py
REM   2) SDK src/ sub-folder if present
REM ------------------------------------------------------------------
set "SDK_EDITABLE="
if exist "%SDK_PATH%\pyproject.toml" (
  set "SDK_EDITABLE=%SDK_PATH%"
) else if exist "%SDK_PATH%\setup.py" (
  set "SDK_EDITABLE=%SDK_PATH%"
) else if exist "%SDK_PATH%\src" (
  set "SDK_EDITABLE=%SDK_PATH%\src"
)

if "%SDK_EDITABLE%"=="" (
  echo ERROR: Could not locate build metadata (pyproject.toml / setup.py) in %SDK_PATH%
  exit /b 1
) else (
  echo Installing from: %SDK_EDITABLE%
  "%VENV_PIP%" install -e "%SDK_EDITABLE%"
)
echo Installing zstandard...
"%VENV_PIP%" install -U zstandard

echo.
echo Running publisher from project root...
pushd "%ROOT%"
"REM Ensure local math-sdk is on PYTHONPATH for imports"
set "PYTHONPATH=%SDK_PATH%;%SDK_PATH%\src;%SDK_PATH%\stakeengine;%PYTHONPATH%"
"%VENV_PY%" "%PUBLISHER%"
set "PUB_RC=%ERRORLEVEL%"
popd
if NOT %PUB_RC%==0 (
  echo Publisher failed with exit code %PUB_RC%.
  exit /b %PUB_RC%
)

echo.
echo Verifying published files...
if not exist "%PUB_DIR%\index.json" (
  echo index.json not found in publish dir & exit /b 1
)
if not exist "%PUB_DIR%\lookup_table.csv" (
  echo lookup_table.csv not found in publish dir & exit /b 1
)
if not exist "%PUB_DIR%\game_logic.jsonl.zst" (
  echo game_logic.jsonl.zst not found in publish dir & exit /b 1
)

echo Running verification on publish directory...
"%VENV_PY%" "%ROOT%\tools\verify_limbo_math.py" --dir "%PUB_DIR%" > "%ROOT%\tools\verify_publish_dir.txt" 2>&1
if NOT %ERRORLEVEL%==0 (
  echo Verification failed for publish dir. See tools\verify_publish_dir.txt
  exit /b 1
)

echo.
echo Mirroring to upload directory...
if not exist "%UPLOAD_DIR%" mkdir "%UPLOAD_DIR%"
copy /Y "%PUB_DIR%\index.json" "%UPLOAD_DIR%\" >nul
copy /Y "%PUB_DIR%\lookup_table.csv" "%UPLOAD_DIR%\" >nul
copy /Y "%PUB_DIR%\game_logic.jsonl.zst" "%UPLOAD_DIR%\" >nul

echo.
echo Verifying upload directory...
"%VENV_PY%" "%ROOT%\tools\verify_limbo_math.py" --dir "%UPLOAD_DIR%" > "%ROOT%\tools\verify_upload_dir.txt" 2>&1
if NOT %ERRORLEVEL%==0 (
  echo Verification failed for upload dir. See tools\verify_upload_dir.txt
  exit /b 1
)

echo.
echo ===================================================
echo DONE
echo ===================================================
echo Published files:
echo   %PUB_DIR%\index.json
echo   %PUB_DIR%\lookup_table.csv
echo   %PUB_DIR%\game_logic.jsonl.zst
echo Mirrored to:
echo   %UPLOAD_DIR%\index.json
echo   %UPLOAD_DIR%\lookup_table.csv
echo   %UPLOAD_DIR%\game_logic.jsonl.zst
echo Backup saved to: %BACKUP_DIR%

echo.
echo --- Verify summaries ---
type "%ROOT%\tools\verify_upload_dir.txt"

exit /b 0
