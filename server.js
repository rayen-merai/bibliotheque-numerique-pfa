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
const multer   = require('multer');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'bibliotheque_secret_jwt_2024';

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Static files ──────────────────────────────────────────────────────────────
function resolveProjectPath(dirName) {
  const inCurrentDir = path.join(__dirname, dirName);
  if (fs.existsSync(inCurrentDir)) return inCurrentDir;
  return path.join(__dirname, '..', dirName);
}

const UTILISATEURS_DIR = resolveProjectPath('utilisateurs');
if (fs.existsSync(UTILISATEURS_DIR)) {
  app.use(express.static(UTILISATEURS_DIR));
}

const EMPRUNTS_HTML = path.join(resolveProjectPath('emprunts'), 'emprunts.html');
if (fs.existsSync(EMPRUNTS_HTML)) {
  app.get('/emprunts.html', (req, res) => res.sendFile(EMPRUNTS_HTML));
}

const EMPRUNTS_DIR = resolveProjectPath('emprunts');
if (fs.existsSync(EMPRUNTS_DIR)) {
  app.use('/emprunts', express.static(EMPRUNTS_DIR));
}

const RECOURCES_DIR = resolveProjectPath('recources');
if (fs.existsSync(RECOURCES_DIR)) {
  app.use('/recources', express.static(RECOURCES_DIR));
}

// Root route — redirect to login
app.get('/', (req, res) => {
  res.redirect('/html.html');
});

// ─── Multer — file uploads for documents ───────────────────────────────────────
const UPLOADS_DIR = path.join(resolveProjectPath('recources'), 'php', 'biblio', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log('📁 Dossier uploads créé:', UPLOADS_DIR);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, Date.now() + '_' + safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    if (ext === 'pdf' || ext === 'epub') {
      cb(null, true);
    } else {
      cb(new Error('Format non autorisé. Seuls PDF et EPUB sont acceptés.'));
    }
  }
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

// ─── DB bootstrap ──────────────────────────────────────────────────────────────
async function initDB() {
  const conn = await db.getConnection();
  try {
    await conn.query("CREATE DATABASE IF NOT EXISTS `bibliotheque`");
    await conn.query("USE `bibliotheque`");

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

    await conn.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id INT AUTO_INCREMENT PRIMARY KEY,
        titre VARCHAR(255) NOT NULL,
        auteur VARCHAR(255) NOT NULL,
        annee INT NULL,
        description TEXT DEFAULT '',
        categorie VARCHAR(100) NOT NULL DEFAULT 'Autre',
        fichier VARCHAR(255) DEFAULT '',
        type_fichier VARCHAR(10) DEFAULT '',
        nb_exemplaires INT DEFAULT 3,
        nb_empruntes INT DEFAULT 0,
        actif TINYINT(1) DEFAULT 1,
        date_ajout TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_actif (actif),
        INDEX idx_titre (titre),
        INDEX idx_categorie (categorie)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await conn.query(`
      CREATE TABLE IF NOT EXISTS emprunts (
        id                 INT AUTO_INCREMENT PRIMARY KEY,
        userId             INT NOT NULL,
        documentId         INT NOT NULL,
        date_emprunt       DATETIME DEFAULT CURRENT_TIMESTAMP,
        date_retour_prevue DATETIME NOT NULL,
        date_retour_reelle DATETIME NULL,
        statut             ENUM('en_cours','retourne','en_retard','perdu') DEFAULT 'en_cours',
        renouvelle         TINYINT(1) DEFAULT 0,
        notes              TEXT NULL,
        traite_par         INT NULL,
        createdAt          DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE,
        INDEX idx_userId (userId),
        INDEX idx_documentId (documentId),
        INDEX idx_statut (statut)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

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

    console.log('✅ Base de données prête');
    console.log('📂 Uploads dossier:', UPLOADS_DIR);
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
    const appRole = ['admin', 'bibliothecaire'].includes(user.role) ? 'admin' : 'user';
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: appRole },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ token, role: appRole, name: user.name, message: 'Connexion réussie ✅' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

app.get('/api/user', authMiddleware(['user', 'admin']), async (req, res) => {
  try {
    const [[user]] = await db.query(
      'SELECT id, name, email, role FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    const appRole = ['admin', 'bibliothecaire'].includes(user.role) ? 'admin' : 'user';
    res.json({ id: user.id, name: user.name, email: user.email, role: appRole });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

app.post('/api/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires ❌' });
  }
  const requestedAdmin = role === 'admin';
  const modernRole = requestedAdmin ? 'admin' : 'etudiant';
  const legacyRole  = requestedAdmin ? 'admin' : 'user';

  try {
    await db.query(
      'INSERT INTO users (name, nom, prenom, email, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [name, name, '', email, password, modernRole]
    );
    return res.json({ message: 'Inscription réussie ✅' });
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR' && err.code !== 'WARN_DATA_TRUNCATED') {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email est déjà utilisé ❌' });
      console.error(err);
      return res.status(500).json({ message: 'Erreur base de données ❌' });
    }
  }
  try {
    await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, password, legacyRole]
    );
    res.json({ message: 'Inscription réussie ✅' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Cet email est déjà utilisé ❌' });
    console.error(err);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, createdAt AS created_at FROM users ORDER BY createdAt DESC'
    );
    return res.json(rows);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') {
      console.error(err);
      return res.status(500).json({ message: 'Erreur base de données ❌' });
    }
  }
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES LIVRES
// ─────────────────────────────────────────────────────────────────────────────

app.get('/api/books', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.titre AS title, d.auteur AS author, d.annee AS year,
             (d.nb_exemplaires - d.nb_empruntes) AS stock_disponible
      FROM documents d
      WHERE d.actif = 1
      ORDER BY d.titre`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

app.get('/api/livres', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, titre, auteur, annee,
             (nb_exemplaires - nb_empruntes) AS stock_disponible,
             nb_exemplaires, nb_empruntes
      FROM documents
      WHERE actif = 1
      ORDER BY titre
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error in /api/livres:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES DOCUMENTS (recources — CRUD complet avec upload)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/documents — liste tous les documents
app.get('/api/documents', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT id, titre, auteur, description, categorie, fichier, type_fichier, date_ajout
      FROM documents
      ORDER BY date_ajout DESC
    `);
    return res.json(rows);
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') {
      console.error(err);
      return res.status(500).json({ message: 'Erreur base de données ❌' });
    }
  }
  // Legacy schema fallback
  try {
    const [rows] = await db.query(`
      SELECT d.id, d.titre, d.auteur, d.description,
             COALESCE(c.nom, 'Autres') AS categorie,
             d.fichier,
             LOWER(COALESCE(d.format, 'pdf')) AS type_fichier,
             COALESCE(d.createdAt, NOW()) AS date_ajout
      FROM documents d
      LEFT JOIN categories c ON d.categorieId = c.id
      ORDER BY date_ajout DESC
    `);
    res.json(rows);
  } catch (legacyErr) {
    console.error(legacyErr);
    res.status(500).json({ message: 'Erreur base de données ❌' });
  }
});

// POST /api/documents — ajouter un document avec fichier
app.post('/api/documents', upload.single('fichier'), async (req, res) => {
  const { titre, auteur, description, categorie } = req.body;

  if (!titre || !auteur || !categorie) {
    // Clean up uploaded file if validation fails
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({
      success: false,
      message: 'Champs obligatoires manquants: titre, auteur, categorie'
    });
  }

  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'Aucun fichier reçu. Veuillez sélectionner un fichier PDF ou EPUB.'
    });
  }

  const filename    = req.file.filename;
  const extension   = path.extname(req.file.originalname).toLowerCase().slice(1);
  const nb_exemplaires = 3;
  const nb_empruntes   = 0;

  try {
    const [result] = await db.query(
      `INSERT INTO documents (titre, auteur, description, categorie, fichier, type_fichier, nb_exemplaires, nb_empruntes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [titre, auteur, description || '', categorie, filename, extension, nb_exemplaires, nb_empruntes]
    );

    console.log(`✅ Document ajouté: "${titre}" → ${filename}`);
    return res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Document ajouté avec succès',
      fichier: filename,
      type_fichier: extension
    });
  } catch (err) {
    // Remove uploaded file if DB insert fails
    fs.unlink(req.file.path, () => {});
    console.error('Erreur insertion document:', err);
    return res.status(500).json({
      success: false,
      message: 'Erreur insertion base de données: ' + err.message
    });
  }
});

// POST /api/documents/:id — modifier un document (optionnellement avec nouveau fichier)
app.post('/api/documents/:id', upload.single('fichier'), async (req, res) => {
  const { id }                              = req.params;
  const { titre, auteur, description, categorie } = req.body;

  if (!titre || !auteur || !categorie) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({
      success: false,
      message: 'Champs obligatoires manquants: titre, auteur, categorie'
    });
  }

  try {
    // Fetch current document to know the old filename
    const [[existing]] = await db.query('SELECT fichier FROM documents WHERE id = ?', [id]);
    if (!existing) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }

    if (req.file) {
      // New file uploaded — update fichier & type_fichier, delete old file
      const newFilename  = req.file.filename;
      const newExtension = path.extname(req.file.originalname).toLowerCase().slice(1);

      await db.query(
        `UPDATE documents SET titre=?, auteur=?, description=?, categorie=?, fichier=?, type_fichier=? WHERE id=?`,
        [titre, auteur, description || '', categorie, newFilename, newExtension, id]
      );

      // Delete old file (non-blocking)
      if (existing.fichier) {
        const oldPath = path.join(UPLOADS_DIR, existing.fichier);
        fs.unlink(oldPath, (err) => {
          if (err && err.code !== 'ENOENT') console.warn('⚠ Impossible de supprimer l\'ancien fichier:', oldPath);
        });
      }

      console.log(`✅ Document #${id} mis à jour avec nouveau fichier: ${newFilename}`);
    } else {
      // No new file — only update metadata
      await db.query(
        `UPDATE documents SET titre=?, auteur=?, description=?, categorie=? WHERE id=?`,
        [titre, auteur, description || '', categorie, id]
      );
      console.log(`✅ Document #${id} mis à jour (métadonnées uniquement)`);
    }

    return res.json({ success: true, message: 'Document mis à jour avec succès' });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    console.error('Erreur modification document:', err);
    return res.status(500).json({ success: false, message: 'Erreur base de données: ' + err.message });
  }
});

// DELETE /api/documents/:id — supprimer un document
app.delete('/api/documents/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [[existing]] = await db.query('SELECT fichier FROM documents WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Document introuvable.' });
    }

    await db.query('DELETE FROM documents WHERE id = ?', [id]);

    // Delete physical file (non-blocking)
    if (existing.fichier) {
      const filePath = path.join(UPLOADS_DIR, existing.fichier);
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') console.warn('⚠ Impossible de supprimer le fichier:', filePath);
      });
    }

    console.log(`✅ Document #${id} supprimé`);
    return res.json({ success: true, message: 'Document supprimé avec succès' });
  } catch (err) {
    console.error('Erreur suppression document:', err);
    return res.status(500).json({ success: false, message: 'Erreur base de données: ' + err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  ROUTES EMPRUNTS
// ─────────────────────────────────────────────────────────────────────────────

const DUREE_EMPRUNT_JOURS = 14;
const QUOTA_MAX = 3;

app.get('/api/emprunts/historique', authMiddleware(['user', 'admin']), async (req, res) => {
  const { statut, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  try {
    let query = `
      SELECT e.id,
             d.titre,
             d.auteur,
             e.date_emprunt,
             e.date_retour_prevue,
             e.date_retour_reelle AS date_retour_effective,
             e.statut,
             e.renouvelle AS prolonge
      FROM emprunts e
      LEFT JOIN documents d ON e.documentId = d.id
      WHERE e.userId = ?`;
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

app.get('/api/emprunts/retards', authMiddleware(['admin']), async (req, res) => {
  try {
    await db.query(
      `UPDATE emprunts SET statut = 'en_retard'
       WHERE statut = 'en_cours' AND date_retour_prevue < NOW()`
    );
    const [rows] = await db.query(`
      SELECT e.id,
             u.name AS utilisateur, u.email,
             d.titre,
             e.date_retour_prevue,
             DATEDIFF(NOW(), e.date_retour_prevue) AS jours_retard
      FROM emprunts e
      JOIN users    u ON e.userId     = u.id
      LEFT JOIN documents d ON e.documentId = d.id
      WHERE e.statut = 'en_retard'
      ORDER BY jours_retard DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/emprunts', authMiddleware(['admin']), async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.id,
             u.name AS utilisateur, u.email,
             d.titre,
             e.date_emprunt, e.date_retour_prevue,
             e.date_retour_reelle AS date_retour_effective,
             e.statut,
             e.renouvelle AS prolonge
      FROM emprunts e
      JOIN users    u ON e.userId     = u.id
      LEFT JOIN documents d ON e.documentId = d.id
      ORDER BY e.date_emprunt DESC
      LIMIT 200
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

app.get('/api/emprunts/stats', authMiddleware(['user', 'admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Si admin, afficher les stats globales; sinon, stats de l'utilisateur
    let en_cours, en_retard, total;

    if (isAdmin) {
      const [[row1]] = await db.query(`SELECT COUNT(*) AS en_cours FROM emprunts WHERE statut = 'en_cours'`);
      const [[row2]] = await db.query(`SELECT COUNT(*) AS en_retard FROM emprunts WHERE statut = 'en_retard'`);
      const [[row3]] = await db.query(`SELECT COUNT(*) AS total FROM emprunts`);
      en_cours = row1.en_cours;
      en_retard = row2.en_retard;
      total = row3.total;
    } else {
      const [[row1]] = await db.query(`SELECT COUNT(*) AS en_cours FROM emprunts WHERE userId = ? AND statut = 'en_cours'`, [userId]);
      const [[row2]] = await db.query(`SELECT COUNT(*) AS en_retard FROM emprunts WHERE userId = ? AND statut = 'en_retard'`, [userId]);
      const [[row3]] = await db.query(`SELECT COUNT(*) AS total FROM emprunts WHERE userId = ?`, [userId]);
      en_cours = row1.en_cours;
      en_retard = row2.en_retard;
      total = row3.total;
    }

    res.json({ en_cours, en_retard, quota_max: QUOTA_MAX, total });
  } catch (err) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

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

    const [[{ total }]] = await conn.query(
      `SELECT COUNT(*) AS total FROM emprunts WHERE userId = ? AND statut IN ('en_cours','en_retard')`,
      [user_id]
    );
    if (total >= QUOTA_MAX) {
      await conn.rollback();
      return res.status(409).json({ message: `Quota atteint (max ${QUOTA_MAX} emprunts simultanés).` });
    }

    const [[docRow]] = await conn.query(
      'SELECT id, titre, nb_exemplaires, nb_empruntes FROM documents WHERE id = ? FOR UPDATE', [livre_id]
    );
    if (!docRow) {
      await conn.rollback();
      return res.status(404).json({ message: 'Livre introuvable.' });
    }

    const availableStock = docRow.nb_exemplaires - docRow.nb_empruntes;
    if (availableStock <= 0) {
      await conn.rollback();
      return res.status(409).json({ message: 'Ce livre n\'est pas disponible pour le moment.' });
    }

    const dateRetour = new Date();
    dateRetour.setDate(dateRetour.getDate() + DUREE_EMPRUNT_JOURS);
    const now = new Date();
    const isoNow = now.toISOString().slice(0, 19).replace('T', ' ');
    const dateRetourISO = dateRetour.toISOString().slice(0, 10);

    const [result] = await conn.query(
      'INSERT INTO emprunts (userId, documentId, date_emprunt, date_retour_prevue, statut, createdAt, updatedAt) VALUES (?, ?, ?, ?, \'en_cours\', ?, ?)',
      [user_id, livre_id, isoNow, dateRetourISO, isoNow, isoNow]
    );

    await conn.query(
      'UPDATE documents SET nb_empruntes = nb_empruntes + 1 WHERE id = ?',
      [livre_id]
    );

    await conn.commit();
    res.status(201).json({
      message: 'Emprunt créé avec succès.',
      emprunt: { id: result.insertId, livre: docRow.titre, date_retour_prevue: dateRetourISO }
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error creating emprunt:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    conn.release();
  }
});

app.put('/api/emprunts/:id/retour', authMiddleware(['user', 'admin']), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const [[emprunt]] = await conn.query('SELECT * FROM emprunts WHERE id = ? FOR UPDATE', [id]);
    if (!emprunt) {
      await conn.rollback();
      return res.status(404).json({ message: 'Emprunt introuvable.' });
    }
    if (emprunt.statut === 'retourne') {
      await conn.rollback();
      return res.status(409).json({ message: 'Ce livre a déjà été retourné.' });
    }
    if (req.user.role === 'user' && emprunt.userId !== req.user.id) {
      await conn.rollback();
      return res.status(403).json({ message: 'Accès interdit.' });
    }
    const now = new Date();
    const isoNow = now.toISOString().slice(0, 19).replace('T', ' ');
    await conn.query(
      `UPDATE emprunts SET statut = 'retourne', date_retour_reelle = ?, updatedAt = ? WHERE id = ?`,
      [isoNow, isoNow, id]
    );
    await conn.query(
      'UPDATE documents SET nb_empruntes = GREATEST(nb_empruntes - 1, 0) WHERE id = ?',
      [emprunt.documentId]
    );
    await conn.commit();
    res.json({ message: 'Retour enregistré avec succès.' });
  } catch (err) {
    await conn.rollback();
    console.error('Error in return:', err);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    conn.release();
  }
});

app.put('/api/emprunts/:id/prolonger', authMiddleware(['user', 'admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const [[emprunt]] = await db.query(
      'SELECT * FROM emprunts WHERE id = ? AND userId = ?', [id, req.user.id]
    );
    if (!emprunt)           return res.status(404).json({ message: 'Emprunt introuvable.' });
    if (emprunt.renouvelle) return res.status(409).json({ message: 'Prolongation déjà effectuée.' });
    if (emprunt.statut === 'retourne') return res.status(409).json({ message: 'Emprunt terminé.' });

    const newDate = new Date(emprunt.date_retour_prevue);
    newDate.setDate(newDate.getDate() + 7);
    const now = new Date();
    await db.query(
      'UPDATE emprunts SET date_retour_prevue = ?, renouvelle = 1, updatedAt = ? WHERE id = ?',
      [newDate.toISOString().split('T')[0], now, id]
    );
    res.json({ message: 'Prolongation accordée.', nouvelle_date: newDate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ─── Multer error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: 'Le fichier est trop volumineux (max 50MB).' });
    }
    return res.status(400).json({ success: false, message: 'Erreur upload: ' + err.message });
  }
  if (err && err.message && err.message.includes('Format non autorisé')) {
    return res.status(400).json({ success: false, message: err.message });
  }
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'JSON invalide dans la requête.' });
  }
  console.error(err.stack);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

// ─── 404 fallback for API routes ───────────────────────────────────────────────
app.use('/api', (req, res) => res.status(404).json({ message: 'Route introuvable.' }));

// ─── Start ─────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`   Pages utilisateurs : http://localhost:${PORT}/html.html`);
    console.log(`   Inscription        : http://localhost:${PORT}/register.html`);
    console.log(`   Gestion emprunts   : http://localhost:${PORT}/emprunts.html`);
    console.log(`   Ressources         : http://localhost:${PORT}/recources/index.html\n`);
  });
});