#Requires -Version 7.0
param(
    [Parameter(Mandatory)][guid] $UserId,
    [Parameter(Mandatory)][string] $Email
)

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '../apps/mobile/.env'
$configJson = & node "--env-file=$envFile" -p 'JSON.stringify({url:process.env.EXPO_PUBLIC_SUPABASE_URL})' 2>$null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer apps/mobile/.env con Node.' }
$config = $configJson | ConvertFrom-Json
if ($config.url -notmatch '^https://[a-z0-9]+\.supabase\.co/?$') {
    throw 'Configura una URL HTTPS de Supabase cloud en apps/mobile/.env.'
}
$baseUrl = $config.url.TrimEnd('/')
Write-Host "Proyecto: $baseUrl"
Write-Host "Se reemplazara la contrasena de $Email ($UserId)."
Write-Host 'La clave administrativa se pide solo aqui: no la guardes en .env ni en el chat.'
$adminKey = Read-Host 'Clave secret o service_role del proyecto (oculta)' -AsSecureString
$newPassword = $null
$confirmation = $null
$headers = $null
$payload = $null
$plainPassword = $null
$plainConfirmation = $null
$stage = 'consulta de la cuenta'
try {
    $plainKey = [pscredential]::new('admin', $adminKey).GetNetworkCredential().Password
    $headers = @{ apikey = $plainKey }
    # Modern secret keys are not JWTs; only legacy service_role uses Bearer.
    if (-not $plainKey.StartsWith('sb_secret_')) {
        $headers.Authorization = "Bearer $plainKey"
    }
    $plainKey = $null
    $account = Invoke-RestMethod -Method Get -Uri "$baseUrl/auth/v1/admin/users/$UserId" `
        -Headers $headers -UserAgent 'Gasway-Auth-Admin/1.0' `
        -SkipHttpErrorCheck -StatusCodeVariable lookupStatus -TimeoutSec 20
    if ($lookupStatus -ne 200) {
        Write-Host "No se pudo consultar la cuenta: HTTP $lookupStatus. No se envio ningun cambio."
        return
    }
    if ($account.user) { $account = $account.user }
    if ($account.id -ne $UserId.ToString() -or $account.email -ine $Email.Trim()) {
        Write-Host 'El UUID y el correo no coinciden con la cuenta consultada. No se envio ningun cambio.'
        return
    }
    $newPassword = Read-Host 'Nueva contrasena (oculta; minimo 8 caracteres)' -AsSecureString
    $confirmation = Read-Host 'Repite la nueva contrasena (oculta)' -AsSecureString
    $plainPassword = [pscredential]::new('user', $newPassword).GetNetworkCredential().Password
    $plainConfirmation = [pscredential]::new('user', $confirmation).GetNetworkCredential().Password
    if ($plainPassword.Length -lt 8 -or $plainPassword -cne $plainConfirmation) {
        Write-Host 'Las contrasenas deben coincidir y tener al menos 8 caracteres. No se envio ningun cambio.'
        return
    }
    $payload = @{ password = $plainPassword } | ConvertTo-Json -Compress
    $plainPassword = $null
    $plainConfirmation = $null
    $stage = 'actualizacion de contrasena'
    $result = Invoke-RestMethod -Method Put -Uri "$baseUrl/auth/v1/admin/users/$UserId" `
        -Headers $headers -UserAgent 'Gasway-Auth-Admin/1.0' `
        -ContentType 'application/json; charset=utf-8' -Body $payload `
        -SkipHttpErrorCheck -StatusCodeVariable updateStatus -TimeoutSec 20
    Write-Host "HTTP de actualizacion: $updateStatus"
    if ($updateStatus -ne 200) {
        $code = if ($result.error_code) { [string] $result.error_code } else { [string] $result.code }
        if ($code -match '^[a-zA-Z0-9_]{1,80}$') { Write-Host "Codigo Auth: $code" }
        Write-Host 'Supabase rechazo la actualizacion. Revisa la clave administrativa o la politica de contrasenas.'
        return
    }
    Write-Host 'Supabase confirmo la actualizacion. Verifica el ingreso con diagnose-login.ps1 y la nueva contrasena.'
} catch {
    # Network exceptions can include privileged headers: do not print the exception.
    Write-Host "No se pudo completar la $stage. Si fue durante la actualizacion, prueba el ingreso antes de repetirla."
} finally {
    $adminKey.Dispose()
    if ($newPassword) { $newPassword.Dispose() }
    if ($confirmation) { $confirmation.Dispose() }
    $plainKey = $null
    $plainPassword = $null
    $plainConfirmation = $null
    $headers = $null
    $payload = $null
    $result = $null
    $account = $null
}
