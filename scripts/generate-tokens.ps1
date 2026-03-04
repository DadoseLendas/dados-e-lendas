# Gera public/assets/tokens/tokens.json escaneando subpastas de public/assets/tokens/
# Uso: powershell -ExecutionPolicy Bypass -File scripts\generate-tokens.ps1

$root = Join-Path $PSScriptRoot "..\public\assets\tokens"
$outputFile = Join-Path $root "tokens.json"

$extensions = @(".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg")
$tokens = @()

if (-not (Test-Path $root)) {
    New-Item -ItemType Directory -Path $root | Out-Null
    Write-Host "Pasta criada: $root"
}

Get-ChildItem -Path $root -Recurse -File | Where-Object {
    $extensions -contains $_.Extension.ToLower()
} | ForEach-Object {
    $file = $_
    $relativePath = $file.FullName.Replace($root, "").Replace("\", "/").TrimStart("/")
    $parts = $relativePath -split "/"
    $category = if ($parts.Count -gt 1) { $parts[0] } else { "Geral" }
    $name = [System.IO.Path]::GetFileNameWithoutExtension($file.Name)

    $tokens += [PSCustomObject]@{
        name     = $name
        url      = "/assets/tokens/$relativePath"
        category = $category
    }
}

$tokens | ConvertTo-Json -Depth 3 | Set-Content -Path $outputFile -Encoding UTF8
Write-Host "tokens.json gerado com $($tokens.Count) tokens em: $outputFile"
