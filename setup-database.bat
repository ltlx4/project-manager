@echo off
echo Setting up PostgreSQL database for Project Manager...
echo.

REM Set PostgreSQL path
set PGPATH="C:\Program Files\PostgreSQL\17\bin"

echo Attempting to create database 'project_manager'...
echo You will be prompted for the PostgreSQL password.
echo.

REM Create database
%PGPATH%\createdb.exe -U postgres project_manager

if %ERRORLEVEL% EQU 0 (
    echo ✅ Database 'project_manager' created successfully!
    echo.
    echo Now running database seeding...
    echo.
    
    REM Run the seeder
    npm run seed
    
    if %ERRORLEVEL% EQU 0 (
        echo.
        echo ✅ Database setup completed successfully!
        echo.
        echo You can now start the server with: npm run dev
        echo.
        echo Test users (password: password123):
        echo - admin@example.com (Admin)
        echo - manager@example.com (Manager)
        echo - john.doe@example.com (Member)
        echo.
    ) else (
        echo ❌ Database seeding failed. Please check the error above.
    )
) else (
    echo ❌ Failed to create database. Please check:
    echo 1. PostgreSQL is running
    echo 2. You entered the correct password
    echo 3. User 'postgres' has database creation privileges
    echo.
    echo You can also try creating the database manually:
    echo 1. Open pgAdmin or psql
    echo 2. Connect as postgres user
    echo 3. Run: CREATE DATABASE project_manager;
    echo 4. Then run: npm run seed
)

pause
