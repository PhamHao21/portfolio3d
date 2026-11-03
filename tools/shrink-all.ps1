# Thu nho texture cho ca 4 nhan vat, giu nguyen extension VRM.
# Chay tu thu muc goc du an. Doi duong dan nguon neu can.
param(
  [string]$Source = "D:\thorw\Documents\models",
  [int]$Size = 1024
)

1..4 | ForEach-Object {
  $in  = Join-Path $Source "Character$_.vrm"
  $out = Join-Path "static\models" "character$_.glb"
  if (-not (Test-Path $in)) { Write-Host "Thieu file: $in" -ForegroundColor Red; return }
  node tools/shrink-vrm.mjs $in $out $Size
}

Write-Host "`n--- Kiem tra ket qua ---" -ForegroundColor Cyan
Get-ChildItem static\models\*.glb | ForEach-Object {
  $b = [System.IO.File]::ReadAllBytes($_.FullName)
  $len = [BitConverter]::ToUInt32($b, 12)
  $json = [Text.Encoding]::UTF8.GetString($b, 20, $len)
  [PSCustomObject]@{
    File   = $_.Name
    MB     = [math]::Round($_.Length / 1MB, 2)
    VRM    = $json.Contains('VRMC_vrm')
    MToon  = $json.Contains('VRMC_materials_mtoon')
    Spring = $json.Contains('VRMC_springBone')
  }
} | Format-Table -AutoSize
