-- ============================================================
--  Bibliothèque Numérique — Schéma Unifié
--  Couvre : utilisateurs · livres · emprunts · ressources (documents)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `bibliotheque`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `bibliotheque`;

-- ── Utilisateurs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(100)  NOT NULL,
  `email`      VARCHAR(100)  UNIQUE NOT NULL,
  `password`   VARCHAR(255)  NOT NULL,
  `role`       ENUM('user','admin') DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Livres (utilisés par emprunts + catalogue) ────────────────
CREATE TABLE IF NOT EXISTS `livres` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `titre`            VARCHAR(255) NOT NULL,
  `auteur`           VARCHAR(255) NOT NULL,
  `annee`            INT,
  `stock_total`      INT DEFAULT 3,
  `stock_disponible` INT DEFAULT 3,
  `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Emprunts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `emprunts` (
  `id`                    INT AUTO_INCREMENT PRIMARY KEY,
  `user_id`               INT NOT NULL,
  `livre_id`              INT NOT NULL,
  `date_emprunt`          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `date_retour_prevue`    DATE NOT NULL,
  `date_retour_effective` DATETIME,
  `statut`                ENUM('en_cours','en_retard','retourne') DEFAULT 'en_cours',
  `prolonge`              BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (`user_id`)  REFERENCES `users`(`id`)  ON DELETE CASCADE,
  FOREIGN KEY (`livre_id`) REFERENCES `livres`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Documents numériques (module recources — PHP) ─────────────
-- Cette table est déjà gérée par les scripts PHP existants.
-- Elle est incluse ici pour référence / création initiale.
CREATE TABLE IF NOT EXISTS `documents` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `titre`        VARCHAR(255) NOT NULL,
  `auteur`       VARCHAR(255) NOT NULL,
  `description`  TEXT         DEFAULT '',
  `categorie`    VARCHAR(100) NOT NULL,
  `fichier`      VARCHAR(255) DEFAULT '',
  `type_fichier` VARCHAR(10)  DEFAULT '',
  `date_ajout`   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ── Données initiales ─────────────────────────────────────────

-- Comptes (mots de passe en clair — à hasher en production)
INSERT IGNORE INTO `users` (`name`, `email`, `password`, `role`) VALUES
  ('Admin Bibliothèque', 'admin@biblio.fr', 'admin123', 'admin'),
  ('Alice Dupont',       'alice@biblio.fr', 'alice123', 'user'),
  ('Bob Martin',         'bob@biblio.fr',   'bob123',   'user');

-- Catalogue de livres
INSERT IGNORE INTO `livres` (`titre`, `auteur`, `annee`, `stock_total`, `stock_disponible`) VALUES
  ('Le Petit Prince',          'Antoine de Saint-Exupéry', 1943, 3, 3),
  ('L\'Alchimiste',            'Paulo Coelho',              1988, 2, 2),
  ('1984',                     'George Orwell',             1949, 3, 3),
  ('Dune',                     'Frank Herbert',             1965, 2, 2),
  ('L\'Étranger',              'Albert Camus',              1942, 3, 3),
  ('Le Seigneur des Anneaux',  'J.R.R. Tolkien',            1954, 2, 2);
