# Project Setup Guide

## Database Setup Options

### Option 1: PostgreSQL (Recommended for Production)

1. **Install PostgreSQL** (if not already installed):
   - Download from: https://www.postgresql.org/download/
   - Or use package manager: `brew install postgresql` (Mac) or `choco install postgresql` (Windows)

2. **Create Database**:
   ```bash
   # Method 1: Using createdb command
   createdb project_manager
   
   # Method 2: Using psql
   psql -U postgres
   CREATE DATABASE project_manager;
   \q
   ```

3. **Update .env file** with your PostgreSQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=project_manager
   DB_USER=postgres
   DB_PASS=your_password
   ```

4. **Run the seeder**:
   ```bash
   npm run seed
   ```

### Option 2: SQLite (Quick Development Setup)

If you prefer a simpler setup without installing PostgreSQL:

1. **Install SQLite dependency**:
   ```bash
   npm install sqlite3
   ```

2. **Update your .env file**:
   ```env
   DB_DIALECT=sqlite
   DB_STORAGE=./database.sqlite
   ```

3. **I can modify the database configuration** to support SQLite if you prefer this option.

### Option 3: Docker PostgreSQL

If you have Docker installed:

1. **Run PostgreSQL in Docker**:
   ```bash
   docker run --name postgres-pm -e POSTGRES_PASSWORD=password -e POSTGRES_DB=project_manager -p 5432:5432 -d postgres:13
   ```

2. **Update .env**:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=project_manager
   DB_USER=postgres
   DB_PASS=password
   ```

3. **Run seeder**:
   ```bash
   npm run seed
   ```

## Quick Start After Database Setup

1. **Seed the database**:
   ```bash
   npm run seed
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```

3. **Test the API**:
   ```bash
   # Health check
   curl http://localhost:5000/api/health
   
   # Login with test user
   curl -X POST http://localhost:5000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password123"}'
   ```

## Test Users (Password: password123)

- **admin@example.com** - Admin user
- **manager@example.com** - Manager user  
- **john.doe@example.com** - Member user
- **jane.smith@example.com** - Member user
- **bob.wilson@example.com** - Member user

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in .env
- Verify database exists
- Check firewall/port settings

### Permission Issues
- Ensure user has database creation privileges
- Check PostgreSQL user permissions

### Port Conflicts
- Change PORT in .env if 5000 is in use
- Check if PostgreSQL port 5432 is available

## Next Steps

Once the database is set up and seeded:

1. **Explore the API** using the documentation in `docs/API.md`
2. **Run tests** with `npm test`
3. **Start development** by modifying routes and models
4. **Deploy** using the deployment guide in README.md

## Need Help?

If you encounter any issues:
1. Check the error messages carefully
2. Verify all environment variables are set
3. Ensure all dependencies are installed
4. Check database connectivity
5. Review the logs for detailed error information
