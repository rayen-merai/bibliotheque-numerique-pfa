/**
 * ============================================================
 *  Bibliothèque Numérique — Serveur Unifié
 *  Gère : utilisateurs · emprunts · livres
 *  Port  : 3000
 * ============================================================
 */

require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const mysql    = require('mysql2/promise');
const jwt      = require('jsonwebtoken');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bibliotheque_secret_jwt_2024';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files ──────────────────────────────────────────────────────────────
// Serve utilisateurs/ pages at the root so their relative links work:
//   http://localhost:3000/html.html   → login
//   http://localhost:3000/admin.html  → admin dashboard
//   http://localhost:3000/user.html   → user dashboard
//   http://localhost:3000/register.html
const UTILISATEURS_DIR = path.join(__dirname, '..', 'utilisateurs');
if (fs.existsSync(UTILISATEURS_DIR)) {
  app.use(express.static(UTILISATEURS_DIR));
}

// Serve emprunts page at /emprunts.html
const EMPRUNTS_HTML = path.join(__dirname, '..', 'emprunts', 'emprunts.html');
if (fs.existsSync(EMPRUNTS_HTML)) {
  app.get('/emprunts.html', (req, res) => res.sendFile(EMPRUNTS_HTML));
}

// Serve recources folder (for static files; PHP files must be accessed via Apache)
const RECOURCES_DIR = path.join(__dirname, '..', 'recources');
if (fs.existsSync(RECOURCES_DIR)) {
  app.use('/recources', express.static(RECOURCES_DIR));
}

// Root route — redirect to login
app.get('/', (req, res) => {
  res.redirect('/html.html');
});

// ─── Database pool ─────────────────────────────────────────────────────────────
const db = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'bibliotheque',
  waitForConnections: true,
  connectionLimit: 10,
});

// ─── DB bootstrap: create tables if they don't exist ──────────────────────────
async function initDB() {
  const conn = await db.getConnection();
  try {
    // Create database if not exists
    await conn.query("CREATE DATABASE IF NOT EXISTS `bibliotheque`");
    await conn.query("USE `bibliotheque`");

    // Users table (role: user | admin)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id         INT AUTO_INCREMENT PRIMARY KEY,
        name       VARCHAR(100)  NOT NULL,
        email      VARCHAR(100)  UNIQUE NOT NULL,
        password   VARCHAR(255)  NOT NULL,
        role       ENUM('user','admin') DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Documents numériques (recources) — create table if needed so sync can run safely
    await conn.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titre VARCHAR(255) NOT NULL,
        auteur VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        categorie VARCHAR(100) NOT NULL,
        fichier VARCHAR(255) DEFAULT '',
        type_fichier VARCHAR(10) DEFAULT '',
        date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Livres table (shared by emprunts + used for /api/books)
    await conn.query(`
      CREATE TABLE IF NOT EXISTS livres (
        id               INT AUTO_INCREMENT PRIMARY KEY,
        titre            VARCHAR(255) NOT NULL,
        auteur           VARCHAR(255) NOT NULL,
        annee            INT,
        stock_total      INT DEFAULT 3,
        stock_disponible INT DEFAULT 3,
        document_id      INT NULL,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    
    try {
      await conn.query('ALTER TABLE livres ADD COLUMN document_id INT NULL');
    } catch (err) {
      // ignore if column already exists
    }

    try {
      await conn.query(`
        INSERT INTO livres (titre, auteur, annee, stock_total, stock_disponible, document_id)
        SELECT d.titre, d.auteur, NULL, 1, 1, d.id
        FROM documents d
        WHERE d.id NOT IN (SELECT document_id FROM livres WHERE document_id IS NOT NULL)
      `);
    } catch (err) {
      // ignore if documents table is not present yet or if sync fails
    }

    // Emprunts table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS emprunts (
        id                    INT AUTO_INCREMENT PRIMARY KEY,
        user_id               INT NOT NULL,
        livre_id              INT NOT NULL,
        date_emprunt          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        date_retour_prevue    DATE NOT NULL,
        date_retour_effective DATETIME,
        statut                ENUM('en_cours','en_retard','retourne') DEFAULT 'en_cours',
        prolonge              BOOLEAN DEFAULT FALSE,
        FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
        FOREIGN KEY (livre_id) REFERENCES livres(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Seed sample data if empty
    const [[{ cnt: userCount }]] = await conn.query('SELECT COUNT(*) AS cnt FROM users');
    if (userCount === 0) {
      await conn.query(`
        INSERT INTO users (name, email, password, role) VALUES
          ('Admin Bibliothèque', 'admin@biblio.fr', 'admin123', 'admin'),
          ('Alice Dupont',       'alice@biblio.fr', 'alice123', 'user'),
          ('Bob Martin',         'bob@biblio.fr',   'bob123',   'user')
      `);
      console.log('✅ Utilisateurs initiaux créés');
    }

    const [[{ cnt: livreCount }]] = await conn.query('SELECT COUNT(*) AS cnt FROM livres');
    if (livreCount === 0) {
      await conn.query(`
        INSERT INTO livres (titre, auteur, annee, stock_total, stock_disponible) VALUES
          ('Le Petit Prince',  'Antoine de Saint-Exupéry', 1943, 3, 3),
          ('L\'Alchimiste',    'Paulo Coelho',              1988, 2, 2),
          ('1984',             'George Orwell',             1949, 3, 3),
          ('Dune',             'Frank Herbert',             1965, 2, 2),
          ('L\'Étranger',      'Albert Camus',              1942, 3, 3),
          ('Le Seigneur des Anneaux', 'J.R.R. Tolkien',    1954, 2, 2)
      `);
      console.log('✅ Livres initiaux créés');
    }

    console.log('✅ Base de données prête');
  } catch (err) {
    console.error('❌ Erreur initDB:', err.message);
  } finally {
    conn.release();
  }
}

// ─── Auth middleware ───────────────────────────────────────────────────────────
function authMiddleware(rolesAutorises = []) {
  return (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Token manquant.' });
    }
    try {
      const token   = header.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      if (rolesAutorises.length && !rolesAutorises.includes(decoded.role)) {
        return res.status(403).json({ message: 'Accès interdit.' });
      }
      req.user = decoded;
      next();
    } catch {
      return res.status(401).json({ message: 'Token invalide ou expiré.' });
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES UTILISATEURS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis.' });
  }
  try {
    const [[user]] = await db.query(
      'SELECT id, name, email, role FROM users WHERE email = ? AND password = ?',
      [email, password]
    );
    if (!user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect ❌' });
    }
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, role: user.role, name: user.name, message: 'Connexion réussie ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

// GET /api/user — get current user information
app.get('/api/user', authMiddleware(['user', 'admin']), async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable.' });
    }
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires ❌' });
  }
  const userRole = role === 'admin' ? 'admin' : 'user';
  try {
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, userRole]
    );
    res.json({ message: 'Inscription réussie ✅' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Cet email est déjà utilisé ❌' });
    }
    console.error(err);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

// GET /api/users  (admin only)
app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES LIVRES  (utilisé par admin.html + user.html + emprunts)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/books  — format attendu par utilisateurs frontend { id, title, author, year }
app.get('/api/books', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, titre AS title, auteur AS author, annee AS year, stock_disponible FROM livres ORDER BY titre'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

async function syncDocumentsToLivres() {
  try {
    await db.query(`
      INSERT INTO livres (titre, auteur, annee, stock_total, stock_disponible, document_id)
      SELECT d.titre, d.auteur, NULL, 1, 1, d.id
      FROM documents d
      WHERE d.id NOT IN (SELECT document_id FROM livres WHERE document_id IS NOT NULL)
    `);
  } catch (err) {
    console.error('Sync documents->livres failed:', err.message);
  }
}

// GET /api/livres  — format natif pour emprunts { id, titre, auteur, stock_disponible }
app.get('/api/livres', async (req, res) => {
  try {
    await syncDocumentsToLivres();
    const [rows] = await db.query(
      'SELECT id, titre, auteur, annee, stock_disponible FROM livres ORDER BY titre'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES EMPRUNTS
// ─────────────────────────────────────────────────────────────────────────────

const DUREE_EMPRUNT_JOURS = 14;
const QUOTA_MAX = 3;

// GET /api/emprunts/historique  — historique de l'utilisateur connecté
app.get('/api/emprunts/historique', authMiddleware(['user', 'admin']), async (req, res) => {
  const { statut, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let query = `
      SELECT e.id, l.titre, l.auteur, e.date_emprunt,
             e.date_retour_prevue, e.date_retour_effective, e.statut, e.prolonge
      FROM emprunts e
      JOIN livres l ON e.livre_id = l.id
      WHERE e.user_id = ?`;
    const params = [req.user.id];
    if (statut) { query += ' AND e.statut = ?'; params.push(statut); }
    query += ' ORDER BY e.date_emprunt DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/emprunts/retards  — emprunts en retard (admin)
app.get('/api/emprunts/retards', authMiddleware(['admin']), async (req, res) => {
  try {
    // Mark overdue first
    await db.query(
      `UPDATE emprunts SET statut = 'en_retard'
       WHERE statut = 'en_cours' AND date_retour_prevue < CURDATE()`
    );
    const [rows] = await db.query(`
      SELECT e.id, u.name AS utilisateur, u.email, l.titre,
             e.date_retour_prevue,
             DATEDIFF(CURDATE(), e.date_retour_prevue) AS jours_retard
      FROM emprunts e
      JOIN users  u ON e.user_id  = u.id
      JOIN livres l ON e.livre_id = l.id
      WHERE e.statut = 'en_retard'
      ORDER BY jours_retard DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/emprunts  — tous les emprunts (admin)
app.get('/api/emprunts', authMiddleware(['admin']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id, u.name AS utilisateur, u.email, l.titre,
             e.date_emprunt, e.date_retour_prevue,
             e.date_retour_effective, e.statut, e.prolonge
      FROM emprunts e
      JOIN users  u ON e.user_id  = u.id
      JOIN livres l ON e.livre_id = l.id
      ORDER BY e.date_emprunt DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// GET /api/emprunts/stats  — statistiques pour le dashboard emprunts
app.get('/api/emprunts/stats', authMiddleware(['user', 'admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const [[{ en_cours }]] = await db.query(
      `SELECT COUNT(*) AS en_cours FROM emprunts WHERE user_id = ? AND statut = 'en_cours'`, [userId]
    );
    const [[{ en_retard }]] = await db.query(
      `SELECT COUNT(*) AS en_retard FROM emprunts WHERE user_id = ? AND statut = 'en_retard'`, [userId]
    );
    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM emprunts WHERE user_id = ?`, [userId]
    );
    res.json({ en_cours, en_retard, quota_max: QUOTA_MAX, total });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// POST /api/emprunts  — créer un emprunt
app.post('/api/emprunts', authMiddleware(['user', 'admin']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const user_id = req.user.id;
    const { livre_id } = req.body;

    if (!livre_id) {
      await conn.rollback();
      return res.status(400).json({ message: 'livre_id requis.' });
    }

    // Check quota
    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) AS total FROM emprunts WHERE user_id = ? AND statut IN ('en_cours','en_retard')`,
      [user_id]
    );
    if (total >= QUOTA_MAX) {
      await conn.rollback();
      return res.status(409).json({ message: `Quota atteint (max ${QUOTA_MAX} emprunts simultanés).` });
    }

    // Lock and check book availability
    const [[livre]] = await conn.query(
      'SELECT id, titre, stock_disponible FROM livres WHERE id = ? FOR UPDATE', [livre_id]
    );
    if (!livre) {
      await conn.rollback();
      return res.status(404).json({ message: 'Livre introuvable.' });
    }
    if (livre.stock_disponible <= 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Aucun exemplaire disponible.' });
    }

    const dateRetour = new Date();
    dateRetour.setDate(dateRetour.getDate() + DUREE_EMPRUNT_JOURS);

    const [result] = await conn.query(
      'INSERT INTO emprunts (user_id, livre_id, date_retour_prevue) VALUES (?, ?, ?)',
      [user_id, livre_id, dateRetour.toISOString().split('T')[0]]
    );
    await conn.query(
      'UPDATE livres SET stock_disponible = stock_disponible - 1 WHERE id = ?', [livre_id]
    );

    await conn.commit();
    res.status(201).json({
      message: 'Emprunt créé avec succès.',
      emprunt: { id: result.insertId, livre: livre.titre, date_retour_prevue: dateRetour }
    });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    conn.release();
  }
});

// PUT /api/emprunts/:id/retour  — retourner un livre
app.put('/api/emprunts/:id/retour', authMiddleware(['user', 'admin']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const [[emprunt]] = await conn.query(
      'SELECT * FROM emprunts WHERE id = ? FOR UPDATE', [id]
    );
    if (!emprunt) {
      await conn.rollback();
      return res.status(404).json({ message: 'Emprunt introuvable.' });
    }
    if (emprunt.statut === 'retourne') {
      await conn.rollback();
      return res.status(409).json({ message: 'Ce livre a déjà été retourné.' });
    }
    // Users can only return their own books
    if (req.user.role === 'user' && emprunt.user_id !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ message: 'Accès interdit.' });
    }

    await conn.query(
      `UPDATE emprunts SET statut = 'retourne', date_retour_effective = NOW() WHERE id = ?`, [id]
    );
    await conn.query(
      'UPDATE livres SET stock_disponible = stock_disponible + 1 WHERE id = ?', [emprunt.livre_id]
    );

    await conn.commit();
    res.json({ message: 'Retour enregistré avec succès.' });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    conn.release();
  }
});

// PUT /api/emprunts/:id/prolonger  — prolonger de 7 jours (une seule fois)
app.put('/api/emprunts/:id/prolonger', authMiddleware(['user', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [[emprunt]] = await db.query(
      'SELECT * FROM emprunts WHERE id = ? AND user_id = ?', [id, req.user.id]
    );
    if (!emprunt)      return res.status(404).json({ message: 'Emprunt introuvable.' });
    if (emprunt.prolonge) return res.status(409).json({ message: 'Prolongation déjà effectuée.' });
    if (emprunt.statut === 'retourne') return res.status(409).json({ message: 'Emprunt terminé.' });

    const newDate = new Date(emprunt.date_retour_prevue);
    newDate.setDate(newDate.getDate() + 7);

    await db.query(
      'UPDATE emprunts SET date_retour_prevue = ?, prolonge = TRUE WHERE id = ?',
      [newDate.toISOString().split('T')[0], id]
    );
    res.json({ message: 'Prolongation accordée.', nouvelle_date: newDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── 404 fallback for API routes ───────────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ message: 'Route introuvable.' }));

// ─── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`   Pages utilisateurs : http://localhost:${PORT}/html.html`);
    console.log(`   Inscription        : http://localhost:${PORT}/register.html`);
    console.log(`   Gestion emprunts   : http://localhost:${PORT}/emprunts.html`);
    console.log(`   Ressources (PHP)   : http://localhost/recources/index.html\n`);
  });
});
