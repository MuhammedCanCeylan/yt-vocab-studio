@echo off
title YT Vocab Studio - GUI Launcher
mode con: cols=80 lines=12
color 0A

echo ================================================
echo    🚀 YT VOCAB STUDY STUDIO - GUI LAUNCHER
echo ================================================
echo.

:: Python'un yüklü olup olmadığını kontrol et
python --version >nul 2>&1
if errorlevel 1 (
    echo [HATA] Python bulunamadi! Lutfen Python'u yukleyin ve PATH'e ekleyin.
    echo.
    pause
    exit /b
)

:: launcher_gui.py dosyasının varlığını kontrol et
if not exist "launcher_gui.py" (
    echo [HATA] launcher_gui.py dosyasi bu klasorde bulunamadi!
    echo.
    pause
    exit /b
)

echo [OK] Python bulundu.
echo [OK] launcher_gui.py dosyasi mevcut.
echo.
echo [*] GUI baslatiliyor, lutfen bekleyin...
echo.

:: GUI'yi çalıştır
python launcher_gui.py

:: Eğer Python betiği kapanırsa buraya gelir
echo.
echo [BILGI] GUI kapatildi.
pause