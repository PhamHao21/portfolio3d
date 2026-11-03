# Nen 1 file .vrm xuat tu VRoid: resize texture 1024 -> webp -> prune -> meshopt
# Dung: .\optimize.ps1 -Name Character1
param([Parameter(Mandatory=$true)][string]$Name)

Copy-Item "$Name.vrm" "$Name.glb" -Force
gltf-transform resize "$Name.glb" "${Name}_1k.glb" --width 1024 --height 1024
gltf-transform webp "${Name}_1k.glb" "${Name}_opt.glb"
gltf-transform prune "${Name}_opt.glb" "${Name}_p.glb" --keep-attributes true
gltf-transform meshopt "${Name}_p.glb" "${Name}_final.glb" --level medium

Remove-Item "$Name.glb", "${Name}_1k.glb", "${Name}_opt.glb", "${Name}_p.glb"

$b = [System.IO.File]::ReadAllBytes((Resolve-Path "${Name}_final.glb"))
$len = [BitConverter]::ToUInt32($b, 12)
$json = [Text.Encoding]::UTF8.GetString($b, 20, $len)

$mb    = [math]::Round((Get-Item "${Name}_final.glb").Length / 1MB, 2)
$skin  = $json.Contains('"skins"')
$nodes = [regex]::Matches($json, '"skin":\d+').Count
$bones = [regex]::Matches($json, '"name":"J_[^"]+"').Count
$hair  = [regex]::Matches($json, '"name":"J_Sec_Hair[^"]*"').Count
$norm  = $json.Contains('"NORMAL"')

""
"=== $Name ==="
"Dung luong     : $mb MB      (can <= 4)"
"skins array    : $skin        (can True)"
"node co skin   : $nodes        (can >= 2)"
"so xuong J_    : $bones"
"so xuong toc   : $hair"
"con NORMAL     : $norm        (can True)"
""
if (-not $skin -or -not $norm -or $nodes -lt 2) { "*** LOI: file hong, dung lai ***" }
