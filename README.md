# Bibliothèque Numérique — Backend Unifié

## Structure du projet après intégration

```
biblio/
├── server.js          ← CE FICHIER (backend unifié)
├── package.json
├── .env
├── schema.sql
│
├── utilisateurs/      ← Frontend inchangé (servi par Node)
│   ├── html.html      → http://localhost:3000/html.html
│   ├── register.html  → http://localhost:3000/register.html
│   ├── admin.html     → http://localhost:3000/admin.html
│   ├── user.html      → http://localhost:3000/user.html
│   ├── js.js
│   ├── app.js
│   └── style.css
│
├── emprunts/          ← Frontend inchangé (servi par Node)
│   └── emprunts.html  → http://localhost:3000/emprunts.html
│
└── recources/         ← Frontend PHP inchangé (servi par Apache/XAMPP)
    ├── index.html     → http://localhost/recources/index.html
    └── php/biblio/    ← Scripts PHP (inchangés)
```

---

## Installation

### 1. Placer le fichier

Copier `server.js`, `package.json`, `.env` dans le dossier `biblio/` :

```
biblio/
├── server.js    ← ici
├── package.json ← ici
├── .env         ← ici
└── ...
```

### 2. Installer les dépendances

```bash
cd biblio
npm install
```

### 3. Base de données

Ouvrir phpMyAdmin (XAMPP) et importer `schema.sql`, OU laisser le serveur la créer automatiquement au démarrage.

Si votre MySQL a un mot de passe, modifier `.env` :
```
DB_PASSWORD=votre_mot_de_passe
```

### 4. Démarrer

```bash
# Terminal 1 — démarrer XAMPP (pour le module recources PHP)
# (ouvrir XAMPP Control Panel → Start Apache + MySQL)

# Terminal 2 — démarrer le serveur Node unifié
cd biblio
node server.js
```

---

## URLs d'accès

| Page | URL |
|------|-----|
| Connexion | http://localhost:3000/html.html |
| Inscription | http://localhost:3000/register.html |
| Dashboard admin | http://localhost:3000/admin.html |
| Espace utilisateur | http://localhost:3000/user.html |
| Gestion des emprunts | http://localhost:3000/emprunts.html |
| Gestion des ressources (PHP) | http://localhost/recources/index.html |

---

## Comptes de démonstration

| Email | Mot de passe | Rôle |
|-------|-------------|------|
| admin@biblio.fr | admin123 | Administrateur |
| alice@biblio.fr | alice123 | Utilisateur |
| bob@biblio.fr   | bob123   | Utilisateur |

---

## API Reference

### Authentification
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
