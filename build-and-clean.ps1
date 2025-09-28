param(
  [Parameter(Mandatory = $true)][string]$ProjectRoot,
  [string]$FrontendPath = ".",
  [string]$MathPath = "math_sdk_project",
  [string]$BuildFrontendCmd = "",
  [string]$BuildMathCmd = "",
  [string]$Keep = "first",
  [ValidateSet("overwrite","sdelete","recycle")][string]$DeleteMode = "overwrite",
  [string[]]$ExcludeDirs = @("node_modules",".git","dist","build",".next","coverage",".turbo",".cache",".trash","env","math_sdk_project","uploads"),
  [string[]]$DeleteOnlyUnder = @("frontend_files","upload\frontend","upload\math"),
  [string[]]$ForbiddenFileNames = @("__init__.py"),
  [switch]$DryRun,
  [switch]$AutoConfirm
)

$ErrorActionPreference = "Stop"

function Invoke-Build {
  param([string]$Path,[string]$Cmd)
  if ([string]::IsNullOrWhiteSpace($Cmd)) { return }
  Push-Location $Path
  try {
    Write-Output "Building: $Path`nCommand: $Cmd"
    $p = Start-Process -FilePath "powershell" -ArgumentList "-NoProfile","-Command",$Cmd -NoNewWindow -Wait -PassThru
    if ($p.ExitCode -ne 0) { throw "Build failed in $Path with exit code $($p.ExitCode)" }
    Write-Output "Build succeeded: $Path"
  } finally { Pop-Location }
}

function Get-AllFiles {
  param([string[]]$Roots,[string[]]$Exclude)
  $sep = [IO.Path]::DirectorySeparatorChar
  $rootsNormalized = $Roots | ForEach-Object { (Resolve-Path $_).Path }
  $files = foreach ($root in $rootsNormalized) {
    Get-ChildItem -Path $root -Recurse -File -Force -ErrorAction SilentlyContinue | Where-Object {
      $parts = $_.FullName.Substring($root.Length).TrimStart($sep) -split [Regex]::Escape("$sep")
      -not ($parts | Where-Object { $_ -in $Exclude })
    }
  }
  $files
}

function Get-DuplicateSets {
  param([System.IO.FileInfo[]]$Files)
  $withHash = $Files | ForEach-Object {
    try {
      $h = Get-FileHash -Algorithm SHA256 -LiteralPath $_.FullName
      [PSCustomObject]@{ File = $_; Hash = $h.Hash }
    } catch {
      Write-Warning "Hash failed: $($_.FullName) - $($_.Exception.Message)"
    }
  }
  $withHash | Group-Object Hash | Where-Object { $_.Count -gt 1 }
}

function Choose-Keep {
  param($group,[string]$Policy)
  $items = $group.Group
  switch ($Policy) {
    "newest" { $keep = ($items | Sort-Object { $_.File.LastWriteTime } -Descending)[0] }
    "oldest" { $keep = ($items | Sort-Object { $_.File.LastWriteTime } )[0] }
    default  { $keep = ($items | Sort-Object { $_.File.FullName } )[0] }
  }
  $delete = $items | Where-Object { $_ -ne $keep }
  ,$keep,($delete)
}

function Secure-Delete {
  param([System.IO.FileInfo]$File,[string]$Mode,[string]$Root,[switch]$WhatIf)
  if ($WhatIf) { Write-Output "[DRY-RUN] Would delete: $($File.FullName)"; return }
  switch ($Mode) {
    "sdelete" {
      $s = Get-Command "sdelete.exe" -ErrorAction SilentlyContinue
      if (-not $s) { throw "sdelete.exe not found in PATH. Install Sysinternals 'sdelete' or use -DeleteMode overwrite." }
      & $s.Path -q -nobanner -accepteula $File.FullName | Out-Null
    }
    "overwrite" {
      $fs = [System.IO.File]::Open($File.FullName, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
      try {
        $len = $File.Length
        $buf = New-Object byte[] 1048576
        $remaining = $len
        $fs.Position = 0
        while ($remaining -gt 0) {
          $chunk = [Math]::Min($remaining, $buf.Length)
          $fs.Write($buf, 0, $chunk)
          $remaining -= $chunk
        }
        $fs.Flush()
      } finally { $fs.Close() }
      Remove-Item -LiteralPath $File.FullName -Force
    }
    "recycle" {
      $trash = Join-Path $Root ".trash"
      $rel = $File.FullName.Substring($Root.Length).TrimStart([IO.Path]::DirectorySeparatorChar)
      $dest = Join-Path $trash $rel
      New-Item -ItemType Directory -Path (Split-Path $dest -Parent) -Force | Out-Null
      Move-Item -LiteralPath $File.FullName -Destination $dest -Force
    }
  }
}

$frontendDir = Join-Path $ProjectRoot $FrontendPath
$mathDir     = Join-Path $ProjectRoot $MathPath

if (-not (Test-Path $frontendDir)) { throw "Frontend path not found: $frontendDir" }
if (-not (Test-Path $mathDir))     { throw "Math path not found: $mathDir" }

Invoke-Build -Path $frontendDir -Cmd $BuildFrontendCmd
Invoke-Build -Path $mathDir -Cmd $BuildMathCmd

$files = Get-AllFiles -Roots @($frontendDir,$mathDir) -Exclude $ExcludeDirs
Write-Output "Scanning files: $($files.Count) files"

$dupGroups = Get-DuplicateSets -Files $files
if (-not $dupGroups -or $dupGroups.Count -eq 0) {
  Write-Output "No duplicates found."
  exit 0
}

# absolute paths of allowed deletion roots
$allowedRoots = $DeleteOnlyUnder | ForEach-Object { (Join-Path $ProjectRoot $_) }

$plan = @()
foreach ($g in $dupGroups) {
  $res = Choose-Keep -group $g -Policy $Keep
  $keep  = $res[0]
  $del   = $res[1]

  # filter delete list: must reside under allowed roots AND not forbidden filename
  $delFiltered = $del | Where-Object {
    $full = $_.File.FullName
    ($allowedRoots | Where-Object { $full.StartsWith($_, [System.StringComparison]::InvariantCultureIgnoreCase) }).Count -gt 0 -and
    (-not ($ForbiddenFileNames -contains $_.File.Name))
  }

  if ($delFiltered.Count -gt 0) {
    $plan += [PSCustomObject]@{
      Hash   = $g.Name
      Keep   = $keep.File.FullName
      Delete = ($delFiltered | ForEach-Object { $_.File.FullName })
    }
  }
}

Write-Output "Duplicate sets: $($plan.Count)"
$totDelete = ($plan | ForEach-Object { $_.Delete.Count } | Measure-Object -Sum).Sum
Write-Output "Files to delete: $totDelete"
$plan | ForEach-Object {
  Write-Output "`nKeep: $($_.Keep)"
  $_.Delete | ForEach-Object { Write-Output "Delete: $_" }
}

$doDry = $DryRun.IsPresent
if ($doDry) {
  Write-Output "`nDry-run only. Re-run without -DryRun to execute."
  exit 0
}

$confirm = if ($AutoConfirm) { "YES" } else { Read-Host "`nType YES to proceed with secure deletion" }
if ($confirm -ne "YES") { Write-Output "Aborted."; exit 1 }

$errors = @()
foreach ($item in $plan) {
  foreach ($path in $item.Delete) {
    try {
      $fi = Get-Item -LiteralPath $path -ErrorAction Stop
      Secure-Delete -File $fi -Mode $DeleteMode -Root $ProjectRoot
    } catch {
      Write-Warning "Failed to delete: $path - $($_.Exception.Message)"
      $errors += $path
    }
  }
}

Write-Output "`nDone. Deleted: $totDelete; Failed: $($errors.Count)"
if ($errors.Count -gt 0) {
  Write-Output "Failures:"; $errors | ForEach-Object { Write-Output $_ }
}
