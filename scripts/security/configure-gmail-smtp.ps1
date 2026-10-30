#Requires -Version 7.0
param(
    [Parameter(Mandatory)][ValidateSet('xnrueexpwzvxotgwmamj', 'gleltbrvpfvfgggcatpt')][string] $ProjectRef,
    [Parameter(Mandatory)][ValidatePattern('^[a-zA-Z0-9._%+-]+@gmail\.com$')][string] $Sender,
    [switch] $Apply
)

$ErrorActionPreference = 'Stop'
if ($env:CI) { throw 'Configuracion SMTP solo local.' }
$repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$tempRoot = [IO.Path]::GetFullPath((Join-Path $repoRoot 'supabase/.temp'))
$workdir = Join-Path $tempRoot ('smtp-' + [guid]::NewGuid().ToString('N'))
$cli = Join-Path $repoRoot 'node_modules/supabase/dist/supabase.js'
$previousSender = $env:GASWAY_SMTP_SENDER
$previousPassword = $env:GASWAY_SMTP_PASSWORD
$secret = $null
$plain = $null
$allowed = @('auth.email.smtp.enabled', 'auth.email.smtp.host', 'auth.email.smtp.port',
    'auth.email.smtp.user', 'auth.email.smtp.pass', 'auth.email.smtp.admin_email',
    'auth.email.smtp.sender_name', 'auth.rate_limit.email_sent')

function Read-SmtpDiff {
    $raw = & node $cli config diff --project-ref $ProjectRef --workdir $workdir --output-format json 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer config diff; salida suprimida.' }
    $diff = ($raw | Out-String) | ConvertFrom-Json
    if ($diff.schema_version -ne 1 -or $diff.target.project_ref -ne $ProjectRef) {
        throw 'Formato o destino inesperado.'
    }
    $changes = @($diff.changes | Where-Object declared)
    foreach ($change in $changes) {
        if (($change.path -join '.') -notin $allowed) { throw 'Cambio fuera del alcance SMTP.' }
    }
    return $changes
}

try {
    $env:GASWAY_SMTP_SENDER = $Sender.ToLowerInvariant()
    $env:GASWAY_SMTP_PASSWORD = 'dry-run-not-a-credential'
    if ($Apply) {
        Write-Host "Destino: $ProjectRef. Remitente: $Sender. No envia correos."
        Write-Host 'Usa una cuenta autorizada con verificacion en dos pasos; preferir una exclusiva para Gasway.'
        $secret = Read-Host 'Contrasena de APLICACION de Google (oculta; no la contrasena de Gmail)' -AsSecureString
        $plain = ([pscredential]::new('smtp', $secret).GetNetworkCredential().Password) -replace ' ', ''
        if ($plain -cnotmatch '^[a-z]{16}$') { throw 'Se esperaba una contrasena de aplicacion de 16 letras.' }
        $env:GASWAY_SMTP_PASSWORD = $plain
        $plain = $null
    }
    New-Item -ItemType Directory -Path (Join-Path $workdir 'supabase') -Force | Out-Null
    # Only environment references are written to disk. Password stays in process memory.
    @'
project_id = "gasway-smtp"
[auth.rate_limit]
email_sent = 5
[auth.email.smtp]
enabled = true
host = "smtp.gmail.com"
port = 465
user = "env(GASWAY_SMTP_SENDER)"
pass = "env(GASWAY_SMTP_PASSWORD)"
admin_email = "env(GASWAY_SMTP_SENDER)"
sender_name = "Gasway"
'@ | Set-Content -LiteralPath (Join-Path $workdir 'supabase/config.toml') -Encoding utf8
    $changes = @(Read-SmtpDiff)
    Write-Host "Proyecto: $ProjectRef. Campos declarados a modificar:"
    $changes | ForEach-Object { Write-Host ('  ' + ($_.path -join '.')) }
    if (-not $Apply) {
        Write-Host 'Solo lectura. Repite con -Apply para configurar SMTP con la clave ingresada localmente.'
        return
    }
    $null = & node $cli config push --project-ref $ProjectRef --workdir $workdir --yes --output-format json 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo confirmar el push SMTP; inspecciona el panel antes de reintentar.' }
    $remaining = @(Read-SmtpDiff | Where-Object { ($_.path -join '.') -ne 'auth.email.smtp.pass' })
    if ($remaining.Count) { throw 'Quedan diferencias SMTP no secretas tras aplicar.' }
    Write-Host 'Configuracion no secreta verificada. La credencial y la entrega aun requieren la prueba real en Test.'
} catch {
    # Never emit subprocess/HTTP exception objects or raw config, including on failure.
    throw 'Configuracion SMTP incompleta; detalles suprimidos para proteger credenciales. Revisa Auth > Email > SMTP.'
} finally {
    $env:GASWAY_SMTP_SENDER = $previousSender
    $env:GASWAY_SMTP_PASSWORD = $previousPassword
    $plain = $null
    if ($secret) { $secret.Dispose() }
    $resolvedWorkdir = [IO.Path]::GetFullPath($workdir)
    if ($resolvedWorkdir.StartsWith($tempRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -and
        [IO.Path]::GetFileName($resolvedWorkdir) -match '^smtp-[a-f0-9]{32}$' -and (Test-Path -LiteralPath $resolvedWorkdir)) {
        Remove-Item -LiteralPath $resolvedWorkdir -Recurse -Force
    }
}
