#Requires -Version 7.0
$ErrorActionPreference = 'Stop'
$resetPath = Join-Path $PSScriptRoot 'reset-auth-password.ps1'

# All credentials and HTTP responses are fixtures; this test never contacts Supabase.
function node {
    $global:LASTEXITCODE = 0
    return '{"url":"https://example.supabase.co"}'
}
function Read-Host {
    param($Prompt, [switch]$AsSecureString)
    $global:gaswayResetTest_promptCount++
    $value = if ($global:gaswayResetTest_promptCount -eq 1) { $global:gaswayResetTest_fakeKey } else { 'Test-ñ-"-1234' }
    return ConvertTo-SecureString $value -AsPlainText -Force
}
function Invoke-RestMethod {
    param($Method, $Uri, $Headers, $UserAgent, $ContentType, $Body,
        [switch]$SkipHttpErrorCheck, $StatusCodeVariable, $TimeoutSec)
    $global:gaswayResetTest_requests++
    if ($Uri -ne 'https://example.supabase.co/auth/v1/admin/users/11111111-1111-4111-8111-111111111111') {
        throw 'Wrong endpoint'
    }
    if ($UserAgent -ne 'Gasway-Auth-Admin/1.0' -or $Headers.apikey -ne $global:gaswayResetTest_fakeKey) {
        throw 'Missing terminal User-Agent or apikey'
    }
    if ($global:gaswayResetTest_fakeKey.StartsWith('sb_secret_')) {
        if ($Headers.ContainsKey('Authorization')) { throw 'Secret key must not use Bearer' }
    } elseif ($Headers.Authorization -ne "Bearer $global:gaswayResetTest_fakeKey") {
        throw 'Legacy key requires Bearer'
    }
    if ($Method -eq 'Get') {
        Set-Variable -Name $StatusCodeVariable -Value 200 -Scope 1
        return [pscustomobject]@{
            id = '11111111-1111-4111-8111-111111111111'
            email = $(if ($global:gaswayResetTest_wrongAccount) { 'other@example.com' } else { 'test@example.com' })
        }
    }
    if ($Method -ne 'Put') { throw 'Unexpected mutation' }
    $global:gaswayResetTest_puts++
    $decoded = $Body | ConvertFrom-Json
    if (@($decoded.PSObject.Properties).Count -ne 1 -or $decoded.password -cne 'Test-ñ-"-1234') {
        throw 'Only the password should change'
    }
    Set-Variable -Name $StatusCodeVariable -Value 200 -Scope 1
    return [pscustomobject]@{}
}

foreach ($key in @('sb_secret_test_fixture', 'eyJlegacy-test-fixture')) {
    foreach ($wrong in @($false, $true)) {
        $global:gaswayResetTest_fakeKey = $key
        $global:gaswayResetTest_wrongAccount = $wrong
        $global:gaswayResetTest_promptCount = 0
        $global:gaswayResetTest_requests = 0
        $global:gaswayResetTest_puts = 0
        $outputText = (& $resetPath -UserId '11111111-1111-4111-8111-111111111111' -Email 'test@example.com' 6>&1 | Out-String)
        if ($outputText.Contains($key) -or $outputText.Contains('Test-ñ-"-1234')) { throw 'Secret in output' }
        $expectedPuts = if ($wrong) { 0 } else { 1 }
        if ($global:gaswayResetTest_puts -ne $expectedPuts -or $global:gaswayResetTest_requests -ne (1 + $expectedPuts)) {
            throw 'Unexpected requests or swallowed mock assertion'
        }
        $expected = if ($wrong) { 'El UUID y el correo no coinciden' } else { 'Supabase confirmo la actualizacion' }
        if (-not $outputText.Contains($expected)) { throw 'Unexpected outcome or swallowed mock assertion' }
        Write-Output "PASS modern=$($key.StartsWith('sb_secret_')) wrong-account=$wrong"
    }
}
