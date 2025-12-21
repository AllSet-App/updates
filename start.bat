@echo off
echo Starting Art Of Frames Management System...
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Start the frontend dev server
echo Starting frontend application...
echo.
echo The application will open in your browser at http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo.

call npm run dev
