-- ============================================================
--  Bibliotheque Numerique - Schema Unifie et Portable
--  Aligne avec server.js (users/livres/documents/emprunts)
-- ============================================================

CREATE DATABASE IF NOT EXISTS `bibliotheque`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_general_ci;

USE `bibliotheque`;

SET FOREIGN_KEY_CHECKS=0;
DROP TABLE IF EXISTS `emprunts`;
DROP TABLE IF EXISTS `livres`;
DROP TABLE IF EXISTS `documents`;
DROP TABLE IF EXISTS `users`;
SET FOREIGN_KEY_CHECKS=1;

-- Users
CREATE TABLE `users` (
  `id`         INT AUTO_INCREMENT PRIMARY KEY,
  `name`       VARCHAR(100) NOT NULL,
  `email`      VARCHAR(100) UNIQUE NOT NULL,
  `password`   VARCHAR(255) NOT NULL,
  `role`       ENUM('user','admin') DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Documents (for recources PHP + emprunts logic)
CREATE TABLE `documents` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `titre`         VARCHAR(255) NOT NULL,
  `auteur`        VARCHAR(255) NOT NULL,
  `annee`         INT NULL,
  `description`   TEXT DEFAULT '',
  `categorie`     VARCHAR(100) NOT NULL,
  `fichier`       VARCHAR(255) DEFAULT '',
  `type_fichier`  VARCHAR(10) DEFAULT '',
  `nb_exemplaires` INT DEFAULT 1,
  `nb_empruntes`  INT DEFAULT 0,
  `actif`         TINYINT(1) DEFAULT 1,
  `date_ajout`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `createdAt`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Livres (catalog used by /api/books and fallback for emprunts)
CREATE TABLE `livres` (
  `id`               INT AUTO_INCREMENT PRIMARY KEY,
  `titre`            VARCHAR(255) NOT NULL,
  `auteur`           VARCHAR(255) NOT NULL,
  `annee`            INT,
  `stock_total`      INT DEFAULT 3,
  `stock_disponible` INT DEFAULT 3,
  `document_id`      INT NULL,
  `created_at`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Emprunts (aligned with routes using userId/documentId/renouvelle)
CREATE TABLE `emprunts` (
  `id`                 INT AUTO_INCREMENT PRIMARY KEY,
  `userId`             INT NOT NULL,
  `documentId`         INT NOT NULL,
  `date_emprunt`       DATETIME DEFAULT CURRENT_TIMESTAMP,
  `date_retour_prevue` DATETIME NOT NULL,
  `date_retour_reelle` DATETIME NULL,
  `statut`             ENUM('en_cours','retourne','en_retard','perdu') DEFAULT 'en_cours',
  `renouvelle`         TINYINT(1) DEFAULT 0,
  `notes`              TEXT NULL,
  `traite_par`         INT NULL,
  `createdAt`          DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed users
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
  ('Admin Bibliotheque', 'admin@biblio.fr', 'admin123', 'admin'),
  ('Alice Dupont',       'alice@biblio.fr', 'alice123', 'user'),
  ('Bob Martin',         'bob@biblio.fr',   'bob123',   'user');

-- Seed books
INSERT INTO `livres` (`titre`, `auteur`, `annee`, `stock_total`, `stock_disponible`) VALUES
  ('Le Petit Prince',         'Antoine de Saint-Exupery', 1943, 3, 3),
  ('L''Alchimiste',           'Paulo Coelho',             1988, 2, 2),
  ('1984',                    'George Orwell',            1949, 3, 3),
  ('Dune',                    'Frank Herbert',            1965, 2, 2),
  ('L''Etranger',             'Albert Camus',             1942, 3, 3),
  ('Le Seigneur des Anneaux', 'J.R.R. Tolkien',           1954, 2, 2);
