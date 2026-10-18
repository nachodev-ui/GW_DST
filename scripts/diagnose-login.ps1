#Requires -Version 7.0
param([string] $Email)

$ErrorActionPreference = 'Stop'
$envFile = Join-Path $PSScriptRoot '../apps/mobile/.env'
$configJson = & node "--env-file=$envFile" -p 'JSON.stringify({url:process.env.EXPO_PUBLIC_SUPABASE_URL,key:process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY})' 2>$null
if ($LASTEXITCODE -ne 0) { throw 'No se pudo leer apps/mobile/.env con Node.' }
$config = $configJson | ConvertFrom-Json
if ($config.url -notmatch '^https://[a-z0-9]+\.supabase\.co/?$' -or -not $config.key) {
    throw 'Configura una URL HTTPS de Supabase cloud y la clave publica en apps/mobile/.env.'
}
$baseUrl = $config.url.TrimEnd('/')
Write-Host "Proyecto consultado: $baseUrl"
if (-not $Email) { $Email = Read-Host 'Correo de la cuenta' }
$password = Read-Host 'Contrasena (oculta; puedes pegarla)' -AsSecureString
$passwordPointer = [IntPtr]::Zero
$payload = $null
$result = $null
try {
    $passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
    $payload = @{
        email = $Email.Trim()
        password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    } | ConvertTo-Json -Compress
    $headers = @{ apikey = $config.key }
    try {
        $result = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/token?grant_type=password" `
            -Headers $headers -ContentType 'application/json; charset=utf-8' -Body $payload `
            -SkipHttpErrorCheck -StatusCodeVariable loginStatus -TimeoutSec 20
    } catch {
        Write-Host 'No se pudo contactar a Auth. Revisa la conexion; no se obtuvo un resultado de acceso.'
        return
    }
    Write-Host "HTTP de acceso: $loginStatus"
    if ($loginStatus -ne 200 -or -not $result.access_token) {
        # Print only a machine code: never dump a response that could contain tokens.
        $code = if ($result.error_code) { [string] $result.error_code } else { [string] $result.code }
        if ($code -match '^[a-zA-Z0-9_]{1,80}$') { Write-Host "Codigo Auth: $code" }
        Write-Host 'Supabase rechazo la solicitud directa; el problema ocurre antes del perfil y las rutas.'
        return
    }
    Write-Host 'Acceso directo correcto: Supabase acepta esas credenciales.'
    try {
        $null = Invoke-RestMethod -Method Post -Uri "$baseUrl/auth/v1/logout?scope=local" `
            -Headers @{ apikey = $config.key; Authorization = "Bearer $($result.access_token)" } `
            -SkipHttpErrorCheck -StatusCodeVariable logoutStatus -TimeoutSec 20
        if ($logoutStatus -ge 200 -and $logoutStatus -lt 300) {
            Write-Host 'Sesion de diagnostico cerrada. Las otras sesiones no se cerraron.'
        } else {
            Write-Host 'No se pudo cerrar la sesion de diagnostico; no se guardaron sus tokens.'
        }
    } catch {
        Write-Host 'No se pudo cerrar la sesion de diagnostico; no se guardaron sus tokens.'
    }
} finally {
    if ($passwordPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    }
    $password.Dispose()
    $payload = $null
    $result = $null
}
