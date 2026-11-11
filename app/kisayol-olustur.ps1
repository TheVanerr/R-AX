# Ana klasöre "Risk Analizi" kısayolunu (simgeli) oluşturur.
# Kısayol uygulamayı Edge'in (yoksa Chrome'un) uygulama penceresinde açar: adres çubuğu ve sekme olmadan, masaüstü programı gibi.
# Klasör taşınırsa bu dosyayı (veya kisayol-olustur.cmd) yeniden çalıştırın.

$ErrorActionPreference = 'Stop'
$app = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $app
$index = Join-Path $app 'index.html'
$icon = Join-Path $app 'assets\ikon.ico'
$url = ([System.Uri]$index).AbsoluteUri

$browsers = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$exe = $browsers | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

$ws = New-Object -ComObject WScript.Shell
$lnk = $ws.CreateShortcut((Join-Path $root 'Risk Analizi.lnk'))
if ($exe) {
  $lnk.TargetPath = $exe
  $lnk.Arguments = "--app=`"$url`""
} else {
  # Edge / Chrome bulunamazsa varsayılan tarayıcıda açar
  $lnk.TargetPath = $index
}
$lnk.WorkingDirectory = $root
$lnk.IconLocation = "$icon,0"
$lnk.Description = 'Risk Analizi — projeler ve modeller, rapor görüntüleme, PDF çıktısı'
$lnk.Save()
Write-Host "Kısayol oluşturuldu: $(Join-Path $root 'Risk Analizi.lnk')"
Write-Host "Tarayıcı: $(if ($exe) { $exe } else { 'varsayılan' })"
