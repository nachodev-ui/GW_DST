#Requires -Version 7.0
# No network, credentials or cloud writes. Exercise the real administrative helper.
$ErrorActionPreference = 'Stop'
$helper = Join-Path $PSScriptRoot 'configure-gmail-smtp.ps1'
$global:gaswaySmtpFixture = 'abcdefghijklmnop'
function Read-Host {
    param($Prompt, [switch] $AsSecureString)
    $global:gaswaySmtpPrompts++
    return ConvertTo-SecureString $global:gaswaySmtpFixture -AsPlainText -Force
}
function node {
    $global:LASTEXITCODE = 0
    $cliArgs = @($args)
    $workIndex = [array]::IndexOf($cliArgs, '--workdir')
    $global:gaswaySmtpWorkdir = $cliArgs[$workIndex + 1]
    $config = Get-Content -LiteralPath (Join-Path $global:gaswaySmtpWorkdir 'supabase/config.toml') -Raw
    if ($config.Contains($global:gaswaySmtpFixture) -or
        -not $config.Contains('pass = "env(GASWAY_SMTP_PASSWORD)"')) {
        throw 'Credential was written to disk or placeholder missing'
    }
    if ($cliArgs[2] -eq 'push') {
        $global:gaswaySmtpPushes++
        if ($global:gaswaySmtpScenario -eq 'push-failure') {
            $global:LASTEXITCODE = 1
            return $global:gaswaySmtpFixture
        }
        return '{}'
    }
    if ($cliArgs[2] -ne 'diff') { throw 'Unexpected CLI operation' }
    $field = if ($global:gaswaySmtpScenario -eq 'scope-rejection') { 'site_url' } else { 'rate_limit.email_sent' }
    $changes = if ($global:gaswaySmtpPushes) { @() } else {
        @(@{ declared = $true; path = @('auth') + $field.Split('.'); local = 5; remote = 2 })
    }
    return @{ schema_version = 1; target = @{ project_ref = 'xnrueexpwzvxotgwmamj' }; changes = $changes } | ConvertTo-Json -Depth 8 -Compress
}

$originalSender = $env:GASWAY_SMTP_SENDER
$originalPassword = $env:GASWAY_SMTP_PASSWORD
try {
    $env:GASWAY_SMTP_SENDER = 'previous-sender'
    $env:GASWAY_SMTP_PASSWORD = 'previous-value'
    foreach ($scenario in @('dry-run', 'apply', 'push-failure', 'scope-rejection')) {
        $global:gaswaySmtpScenario = $scenario
        $global:gaswaySmtpPrompts = 0
        $global:gaswaySmtpPushes = 0
        $global:gaswaySmtpWorkdir = $null
        $failed = $false
        $captured = $null
        try {
            $captured = (& $helper -ProjectRef xnrueexpwzvxotgwmamj -Sender fixture@gmail.com -Apply:($scenario -ne 'dry-run') 6>&1 | Out-String)
        } catch {
            $failed = $true
            $captured = [string] $_
        }
        if ($captured.Contains($global:gaswaySmtpFixture)) { throw 'Credential leaked into output' }
        if ($failed -ne ($scenario -in @('push-failure', 'scope-rejection'))) { throw "Unexpected outcome: $scenario" }
        $expectedPushes = if ($scenario -in @('apply', 'push-failure')) { 1 } else { 0 }
        if ($global:gaswaySmtpPushes -ne $expectedPushes) { throw 'Unexpected mutation count' }
        if ($scenario -eq 'dry-run' -and $global:gaswaySmtpPrompts) { throw 'Dry run prompted for secret' }
        if ($env:GASWAY_SMTP_SENDER -ne 'previous-sender' -or $env:GASWAY_SMTP_PASSWORD -ne 'previous-value') {
            throw 'Environment was not restored'
        }
        if (Test-Path -LiteralPath $global:gaswaySmtpWorkdir) { throw 'Temporary overlay was not removed' }
        Write-Output "PASS SMTP $scenario : scope, mutation count, redaction, cleanup and environment"
    }
} finally {
    $env:GASWAY_SMTP_SENDER = $originalSender
    $env:GASWAY_SMTP_PASSWORD = $originalPassword
}
