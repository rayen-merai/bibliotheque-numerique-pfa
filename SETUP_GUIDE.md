# 🚀 Setup Guide - Running on XAMPP

## Prerequisites
- XAMPP installed with Apache, MySQL/MariaDB, and PHP
- Node.js installed (portable or regular)

---

## 🔧 **Step 1: Start XAMPP Services**

1. **Open XAMPP Control Panel** (search for "xampp-control.exe" or run it from XAMPP folder)
2. **Start these services:**
   - ✅ Apache (green "Running")
   - ✅ MySQL (green "Running")
   - ℹ️ PHP is included with Apache

---

## 🔧 **Step 2: Start Node.js Server**

Open PowerShell and run:

```powershell
cd "C:\xampp\htdocs\FINAL"
& "$env:TEMP\nodejs\node.exe" server.js
```

You should see:
```
🚀 Serveur démarré sur http://localhost:3000
```

---

## 🔧 **Step 3: Access the Application**

### Main App (through XAMPP Apache):
```
http://localhost/FINAL/
```

This automatically redirects to login:
```
http://localhost/FINAL/html.html
```

### Components:
- **Login Page**: `http://localhost/FINAL/html.html`
- **User Dashboard**: `http://localhost/FINAL/user.html`
- **Admin Dashboard**: `http://localhost/FINAL/admin.html`
- **Emprunts (Loans)**: `http://localhost:3000/emprunts.html`
- **Recources (Documents)**: `http://localhost/FINAL/recources/index.html`

---

## 📝 Test Credentials

### User Account:
- **Email**: alice@biblio.fr
- **Password**: alice123

### Admin Account:
- **Email**: admin@biblio.fr
- **Password**: admin123

---

## ✅ Architecture

```
┌─────────────────────────────────────────┐
│  Browser (http://localhost/FINAL)       │
└─────────────────┬───────────────────────┘
                  │
    ┌─────────────┴──────────────┐
    │                            │
    ▼                            ▼
[Apache:80]                  [Node.js:3000]
├─ Static Files              ├─ /api/login
├─ HTML/CSS/JS               ├─ /api/register
└─ PHP Backend              ├─ /api/emprunts
   (recources)              └─ /emprunts.html
                            
    Both use: MySQL (localhost:3306)
```

---

## 🐛 Troubleshooting

### Apache won't start?
- Port 80 already in use
- Check Services > Apache22/Apache24

### PHP shows blank?
- Make sure Apache is running
- Check Apache error log in XAMPP Control Panel

### Node.js crashes?
- Port 3000 already in use
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
