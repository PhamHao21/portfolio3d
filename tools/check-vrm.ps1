# Kiem tra file .vrm con du extension VRM khong.
# Dung: .\check-vrm.ps1                (quet ca thu muc hien tai)
Get-ChildItem *.vrm, *.glb | ForEach-Object {
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
