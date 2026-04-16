# 🚀 Setup Guide - Bibliothèque Numérique

Complete setup instructions for the Digital Library project.

---

## Prerequisites

- **Node.js** v14+ (with npm)
- **XAMPP** (Apache, MySQL, PHP)
- **Git** (optional, for version control)

---

## 🔧 Step 1: Start XAMPP Services

1. Open **XAMPP Control Panel** (search for "xampp-control.exe")
2. Start these services:
   - ✅ **Apache** (for static files)
   - ✅ **MySQL** (for database)

---

## 🔧 Step 2: Install Dependencies

Open PowerShell in the project folder:

```powershell
cd C:\xampp\htdocs\bibliotheque-numerique-pfa
npm install
```

This installs all required packages:
- express (web server)
- mysql2 (database)
- multer (file uploads)
- jsonwebtoken (authentication)
- cors (cross-origin support)

---

## 🔧 Step 3: Database Setup

### Option A: Automatic (Recommended)
The server automatically creates the database and tables on first run.

### Option B: Manual Setup
1. Open **phpMyAdmin** (http://localhost/phpmyadmin)
2. Create database: `bibliotheque`
3. Import `schema.sql`:
   - Select database → Import tab → Choose `schema.sql` → Execute

### Option C: Command Line
```bash
mysql -u root -p bibliotheque < schema.sql
```

---

## 🔧 Step 4: Environment Configuration

Create or update `.env` file in the root directory:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bibliotheque
DB_PORT=3306
JWT_SECRET=your_secret_key_here
PORT=3000
```

**If MySQL has a password:**
```
DB_PASSWORD=your_mysql_password
```

---

## 🔧 Step 5: Start the Server

### Option A: Using npm
```bash
npm start
```

### Option B: Using batch file
Double-click `start-server.bat`

### Option C: Using Node directly
```bash
node server.js
```

You should see:
```
✅ Base de données prête
📂 Uploads dossier: C:\xampp\htdocs\bibliotheque-numerique-pfa\recources\php\biblio\uploads
🚀 Serveur démarré sur http://localhost:3000
```

---

## ✅ Verify Installation

Server is running if you see no errors. Test the app:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/html.html -WarningAction SilentlyContinue | Select-Object StatusCode
```

Should return: `StatusCode : 200`

---

## 📍 Access Points

| Component | URL | Purpose |
|-----------|-----|---------|
| Login | http://localhost:3000/html.html | User authentication |
| Register | http://localhost:3000/register.html | Create new account |
| Admin Panel | http://localhost:3000/admin.html | Manage users & stats |
| User Dashboard | http://localhost:3000/user.html | View profile & loans |
| Loan Management | http://localhost:3000/emprunts.html | Check out/return books |
| Document Upload | http://localhost:3000/recources/index.html | Upload & browse books |

---

## 👥 Test Accounts

Use these to login after setup:

```
Admin:
  Email: admin@biblio.fr
  Password: admin123

User:
  Email: alice@biblio.fr
  Password: alice123
```

---

## 🐛 Troubleshooting

### Port 3000 already in use
```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill process
taskkill /F /PID <PID>
```

### MySQL connection fails
- Check XAMPP MySQL is running
- Verify credentials in `.env`
- Test connection:
  ```bash
  mysql -u root -p -h localhost
  ```

### File uploads not working
- Check folder exists: `recources/php/biblio/uploads/`
- Verify write permissions on folder
- Check file size < 50MB
- Ensure file is PDF or EPUB

### Admin stats showing 0
- This has been fixed in the latest version
- If still broken, restart server

### Database tables missing
- Delete `bibliotheque` database in phpMyAdmin
- Restart server (will auto-create tables)

---

## 📊 Project Status

✅ Upload system working
✅ Database integration complete
✅ Admin statistics fixed
✅ User authentication operational
✅ Loan tracking functional
✅ File storage configured

---

## 🔐 Security Notes

- Change `JWT_SECRET` in `.env` before production
- Never commit `.env` file to git
- Use strong password for MySQL if exposing publicly
- Validate all file uploads (PDF/EPUB only)

---

## 📝 Next Steps

1. Create accounts for all users
2. Upload initial book collection
3. Test borrowing workflow
4. Verify admin dashboard statistics
5. Deploy to production if needed

For more info, see `README.md`
- Use different port: `$env:TEMP\nodejs\node.exe server.js --port 3001`

### MySQL error?
- Start MySQL in XAMPP Control Panel
- Verify database exists: `CREATE DATABASE bibliotheque`

---

## 📊 Database Status

The application uses a unified `bibliotheque` database with tables:
- `users` - User accounts
- `livres` - Books catalog
- `emprunts` - Loan records
- `documents` - Digital resources

Database is auto-created on first Node.js server start.

---

## 🎯 Next Steps

1. ✅ Apache running (port 80)
2. ✅ MySQL running
3. ✅ Node.js running (port 3000)
4. ✅ Open `http://localhost/FINAL/`
5. ✅ Log in and test!

Enjoy your Digital Library! 📚
