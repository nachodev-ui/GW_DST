#Requires -Version 7.0
# Local, private key custody. Never upload the keys directory to Drive.
$ErrorActionPreference = 'Stop'
if ($env:CI) { throw 'La preparacion de backup es solo local.' }
$backupRoot = Join-Path $env:LOCALAPPDATA 'Gasway/Backups'
$sid = [Security.Principal.WindowsIdentity]::GetCurrent().User
New-Item -ItemType Directory -Path $backupRoot -Force | Out-Null
$acl = [Security.AccessControl.DirectorySecurity]::new()
$acl.SetOwner($sid)
$acl.SetAccessRuleProtection($true, $false)
foreach ($principal in @($sid, [Security.Principal.SecurityIdentifier]::new('S-1-5-18'))) {
    $rule = [Security.AccessControl.FileSystemAccessRule]::new($principal, 'FullControl',
        'ContainerInherit,ObjectInherit', 'None', 'Allow')
    $acl.AddAccessRule($rule)
}
Set-Acl -LiteralPath $backupRoot -AclObject $acl
foreach ($directory in @('keys', 'archives', 'tools')) {
    New-Item -ItemType Directory -Path (Join-Path $backupRoot $directory) -Force | Out-Null
}
$version = '1.3.2'
$checksum = 'f48d8f8f9ebe903ab5027ed067652f2cc1db94bc206976430133b905dcd8e8c7'
$toolRoot = Join-Path $backupRoot "tools/age-v$version"
if (-not (Test-Path -LiteralPath (Join-Path $toolRoot 'age/age.exe'))) {
    New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
    $zipPath = Join-Path $toolRoot 'age.zip'
    Invoke-WebRequest -Uri "https://github.com/FiloSottile/age/releases/download/v$version/age-v$version-windows-amd64.zip" -OutFile $zipPath
    if ((Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $checksum) {
        throw 'Checksum de age incorrecto; no ejecutar la descarga.'
    }
    Expand-Archive -LiteralPath $zipPath -DestinationPath $toolRoot -Force
}
$keygen = Join-Path $toolRoot 'age/age-keygen.exe'
$identity = Join-Path $backupRoot 'keys/identity.agekey'
if (-not (Test-Path -LiteralPath $identity)) {
    $null = & $keygen -o $identity 2>&1
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la clave; salida suprimida.' }
}
$recipient = & $keygen -y $identity 2>$null
if ($LASTEXITCODE -ne 0 -or $recipient -cnotmatch '^age1[0-9a-z]{58}$') {
    throw 'Clave de backup no valida; no se modifica la existente.'
}
$recipient | Set-Content -LiteralPath (Join-Path $backupRoot 'keys/recipient.txt') -Encoding ascii
Write-Host "Preparado: $backupRoot"
Write-Host 'ACL: solo usuario actual y SYSTEM. Clave privada fuera del repositorio y de Drive.'
Write-Host 'Custodia: conserva una segunda copia de keys/identity.agekey en un lugar privado separado de Drive y de este PC.'
Write-Host "Destinatario publico: $recipient"
