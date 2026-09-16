# Reads the app identifier from tauri.conf.json so the paths are always correct
$id = (Get-Content "src-tauri/tauri.conf.json" -Raw | ConvertFrom-Json).identifier

$roaming = Join-Path $env:APPDATA $id        # where auth.json lives
$local   = Join-Path $env:LOCALAPPDATA $id   # where vault.hold and salt.txt live

# Deletes each file if it exists, and reports what happened
foreach ($file in @(
    (Join-Path $roaming "auth.json"),
    (Join-Path $local "vault.hold"),
    (Join-Path $local "salt.txt")
)) {
    if (Test-Path $file) {
        Remove-Item $file -Force
        Write-Host "Deleted $file"
    } else {
        Write-Host "Not found: $file"
    }
}