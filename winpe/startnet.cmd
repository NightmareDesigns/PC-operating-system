@echo off
REM ====================================================================
REM Nightmare OS - Windows PE Startup Script
REM ====================================================================
REM This script is copied to X:\Windows\System32\startnet.cmd in the
REM WinPE image and runs automatically when Windows PE boots.
REM ====================================================================

wpeinit

cls
echo.
echo ================================================================
echo.
echo   ███╗   ██╗██╗ ██████╗ ██╗  ██╗████████╗███╗   ███╗ █████╗ ██████╗ ███████╗
echo   ████╗  ██║██║██╔════╝ ██║  ██║╚══██╔══╝████╗ ████║██╔══██╗██╔══██╗██╔════╝
echo   ██╔██╗ ██║██║██║  ███╗███████║   ██║   ██╔████╔██║███████║██████╔╝█████╗
echo   ██║╚██╗██║██║██║   ██║██╔══██║   ██║   ██║╚██╔╝██║██╔══██║██╔══██╗██╔══╝
echo   ██║ ╚████║██║╚██████╔╝██║  ██║   ██║   ██║ ╚═╝ ██║██║  ██║██║  ██║███████╗
echo   ╚═╝  ╚═══╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
echo.
echo                    Nightmare OS - Windows PE Edition
echo                    ===================================
echo.
echo                         Booting into nightmare...
echo.
echo ================================================================
echo.

REM Initialize network
echo [*] Initializing network...
wpeutil InitializeNetwork
timeout /t 2 /nobreak > nul
echo [+] Network initialized
echo.

REM Set up environment variables
set NIGHTMARE_OS_DIR=X:\NightmareOS
set PYTHON_DIR=X:\Python

REM Check if Nightmare OS files exist
if not exist "%NIGHTMARE_OS_DIR%\index.html" (
    echo [!] ERROR: Nightmare OS files not found at %NIGHTMARE_OS_DIR%
    echo [!] The WinPE image may not have been built correctly.
    echo.
    pause
    exit /b 1
)

echo [+] Nightmare OS files found
echo.

REM Change to Nightmare OS directory
cd /d "%NIGHTMARE_OS_DIR%"

REM Start web server
echo [*] Starting web server on http://localhost:8080...

REM Try Python if available
if exist "%PYTHON_DIR%\python.exe" (
    echo [+] Using embedded Python
    start /min "%PYTHON_DIR%\python.exe" -m http.server 8080
) else if exist "%SystemRoot%\System32\python.exe" (
    echo [+] Using system Python
    start /min python -m http.server 8080
) else (
    REM Fallback: Use PowerShell as web server
    echo [+] Using PowerShell web server
    start /min powershell -WindowStyle Hidden -Command "$listener = New-Object System.Net.HttpListener; $listener.Prefixes.Add('http://localhost:8080/'); $listener.Start(); Write-Host 'Server started on port 8080'; while ($listener.IsListening) { $context = $listener.GetContext(); $request = $context.Request; $response = $context.Response; $file = 'X:\NightmareOS' + $request.Url.LocalPath; if ($request.Url.LocalPath -eq '/') { $file = 'X:\NightmareOS\index.html' }; if (Test-Path $file) { $content = [System.IO.File]::ReadAllBytes($file); $response.ContentLength64 = $content.Length; $response.OutputStream.Write($content, 0, $content.Length); } else { $response.StatusCode = 404; }; $response.Close(); }"
)

echo [+] Web server started
echo.

REM Wait for server to initialize
echo [*] Waiting for web server to initialize...
timeout /t 5 /nobreak > nul
echo [+] Server ready
echo.

REM Launch browser
echo [*] Launching browser...

REM Try Microsoft Edge (most common in WinPE)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    echo [+] Launching Microsoft Edge in kiosk mode
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:8080/index.html" --edge-kiosk-type=fullscreen --no-first-run --disable-features=msEdgeFirstRunDialog
    goto :browser_launched
)

if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    echo [+] Launching Microsoft Edge in kiosk mode
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --kiosk "http://localhost:8080/index.html" --edge-kiosk-type=fullscreen --no-first-run --disable-features=msEdgeFirstRunDialog
    goto :browser_launched
)

REM Try Internet Explorer as fallback
if exist "%ProgramFiles%\Internet Explorer\iexplore.exe" (
    echo [+] Launching Internet Explorer
    start "" "%ProgramFiles%\Internet Explorer\iexplore.exe" -k "http://localhost:8080/index.html"
    goto :browser_launched
)

REM No browser found
echo [!] ERROR: No compatible browser found!
echo [!] Please install Microsoft Edge or Internet Explorer in the WinPE image.
echo.
echo You can still access Nightmare OS by opening a browser manually:
echo     http://localhost:8080/index.html
echo.
pause
goto :end

:browser_launched
echo [+] Browser launched successfully
echo.

:end
echo ================================================================
echo.
echo Nightmare OS is now running!
echo.
echo Quick Tips:
echo   - Press Alt+Tab to switch between browser and command prompt
echo   - Press Ctrl+Alt+Del to access Task Manager
echo   - All changes are stored in RAM (lost on reboot)
echo   - PE automatically reboots after 72 hours
echo.
echo Troubleshooting:
echo   - Check web server: netstat -an ^| find "8080"
echo   - Test connection: curl http://localhost:8080
echo   - View processes: tasklist ^| find "python"
echo   - View IP config: ipconfig /all
echo.
echo Press any key to open a command prompt for advanced tasks...
echo ================================================================
pause > nul

REM Open command prompt for advanced users
cmd /k
