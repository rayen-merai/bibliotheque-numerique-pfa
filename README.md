# 📚 Bibliothèque Numérique (Digital Library)

A comprehensive digital library management system with document uploads, user authentication, borrowing tracking, and admin dashboard.

## ✨ Features

- **User Authentication** - Secure login and registration with JWT
- **Document Management** - Upload PDF/EPUB files to the library
- **Book Catalog** - Browse and search available books
- **Borrowing System** - Check out books and track loan history
- **Admin Dashboard** - Manage users, view statistics, and track active loans
- **File Upload** - Upload documents with automatic file storage and database tracking

## 🏗️ Project Structure

```
bibliotheque-numerique-pfa/
├── server.js              # Express server (port 3000)
├── package.json           # Dependencies
├── schema.sql             # Database schema
├── index.php              # Entry point
│
├── utilisateurs/          # User authentication pages
│   ├── html.html         # Login page
│   ├── register.html     # Registration page
│   ├── admin.html        # Admin dashboard
│   ├── user.html         # User dashboard
│   └── app.js, style.css
│
├── emprunts/             # Loan management
│   ├── emprunts.html    # Loan history & checkout
│   └── app.js
│
├── recources/            # Document management
│   ├── index.html       # Document upload/browse
│   ├── app.js
│   └── php/biblio/uploads/  # Uploaded files storage
│
└── start-server.bat      # Batch script to start server
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MySQL/MariaDB running on XAMPP
- npm installed

### Installation & Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Database**
   - MySQL should be running via XAMPP
   - Server will auto-create tables from `schema.sql`
   - If password protected, update `.env` file:
     ```
     DB_HOST=localhost
     DB_USER=root
     DB_PASSWORD=your_password
     DB_NAME=bibliotheque
     DB_PORT=3306
     ```

3. **Start the Server**
   ```bash
   npm start
   ```
   Or use: `start-server.bat`

4. **Access the Application**
   - Login: http://localhost:3000/html.html
   - Admin Dashboard: http://localhost:3000/admin.html
   - User Dashboard: http://localhost:3000/user.html
   - Loan Management: http://localhost:3000/emprunts.html
   - Document Upload: http://localhost:3000/recources/index.html

---

## 👥 Test Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@biblio.fr | admin123 | Administrator |
| alice@biblio.fr | alice123 | User |
| bob@biblio.fr | bob123 | User |

---

## 📡 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - New user registration

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents` - Upload new document (requires file + title/author/category)
- `GET /api/documents/:id` - Get document details
- `PUT /api/documents/:id` - Update document
- `DELETE /api/documents/:id` - Delete document

### Emprunts (Loans)
- `GET /api/emprunts` - List user loans
- `POST /api/emprunts` - Create new loan
- `GET /api/emprunts/stats` - Get loan statistics (admin view shows all, user view shows personal)
- `PUT /api/emprunts/:id` - Return a book

---

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MySQL/MariaDB
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Authentication**: JWT (JSON Web Tokens)
- **File Upload**: Multer (PDF/EPUB files up to 50MB)
- **API**: RESTful JSON API

---

## 📝 Key Fixes & Features

✅ **File Upload System** - PDF and EPUB files upload to `recources/php/biblio/uploads/`
✅ **Database Integration** - Documents stored in MySQL with metadata
✅ **Admin Statistics** - Fixed to show global loan stats for admins
✅ **User Authentication** - Secure JWT-based authentication
✅ **CORS Enabled** - Cross-origin requests supported
✅ **Error Handling** - Comprehensive error responses

---

## ⚙️ Environment Configuration

Create a `.env` file in root directory:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=bibliotheque
DB_PORT=3306
JWT_SECRET=your_secret_key
PORT=3000
```

---

## 📖 Documentation

See `SETUP_GUIDE.md` for detailed setup instructions.
| Méthode | Route | Description |
|---------|-------|-------------|
| POST | /api/login | Connexion → retourne JWT |
| POST | /api/register | Inscription |

### Utilisateurs
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/users | — | Liste des utilisateurs |
| GET | /api/books | — | Catalogue (format titre/author/year) |
| GET | /api/livres | — | Catalogue (format titre/auteur) |

### Emprunts
| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | /api/emprunts | admin | Tous les emprunts |
| GET | /api/emprunts/historique | user/admin | Mes emprunts |
| GET | /api/emprunts/retards | admin | Emprunts en retard |
| GET | /api/emprunts/stats | user/admin | Statistiques |
| POST | /api/emprunts | user/admin | Créer un emprunt |
| PUT | /api/emprunts/:id/retour | user/admin | Retourner un livre |
| PUT | /api/emprunts/:id/prolonger | user/admin | Prolonger de 7 jours |

---

## Ce qui a changé vs l'original

| Problème | Avant | Après |
|----------|-------|-------|
| Serveurs | 2 Node.js + Apache | 1 Node.js + Apache |
| Port conflict | emprunts:3000 + utilisateurs:3000 | server.js:3000 |
| Bases de données | `test_db` + `bibliotheque` | `bibliotheque` uniquement |
| JWT | Faux token (`"jwt-token-1"`) | Vrai JWT signé |
| Rôles | `user/admin` vs `utilisateur/bibliothecaire` | `user/admin` partout |
=======
# bibliotheque-numerique-pfa
>>>>>>> 480e3095d1b72bd7948930e1d9ded691a0040708
