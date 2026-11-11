@echo off
rem Ana klasöre "Risk Analizi" kısayolunu (simgeli) oluşturur. Klasör taşınırsa yeniden çalıştırın.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0kisayol-olustur.ps1"
pause
