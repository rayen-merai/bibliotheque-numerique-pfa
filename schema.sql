-- ============================================================
--  Bibliotheque Numerique - Schema Unifie
--  SINGLE DATABASE: documents is the only borrowable catalog
--  No livres sync table - documents is source of truth
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

-- Documents (PRIMARY - ONLY - borrowable catalog)
-- Used by both resources (PHP upload) and emprunts (borrowing system)
CREATE TABLE `documents` (
  `id`            INT AUTO_INCREMENT PRIMARY KEY,
  `titre`         VARCHAR(255) NOT NULL,
  `auteur`        VARCHAR(255) NOT NULL,
  `annee`         INT NULL,
  `description`   TEXT DEFAULT '',
  `categorie`     VARCHAR(100) NOT NULL DEFAULT 'Autre',
  `fichier`       VARCHAR(255) DEFAULT '',
  `type_fichier`  VARCHAR(10) DEFAULT '',
  `nb_exemplaires` INT DEFAULT 3,
  `nb_empruntes`  INT DEFAULT 0,
  `actif`         TINYINT(1) DEFAULT 1,
  `date_ajout`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `createdAt`     DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_actif (actif),
  INDEX idx_titre (titre),
  INDEX idx_categorie (categorie)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Emprunts (loans) - linked to documents
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
  FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`documentId`) REFERENCES `documents`(`id`) ON DELETE CASCADE,
  INDEX idx_userId (userId),
  INDEX idx_documentId (documentId),
  INDEX idx_statut (statut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Seed users
INSERT INTO `users` (`name`, `email`, `password`, `role`) VALUES
  ('Admin Bibliotheque', 'admin@biblio.fr', 'admin123', 'admin'),
  ('Alice Dupont',       'alice@biblio.fr', 'alice123', 'user'),
  ('Bob Martin',         'bob@biblio.fr',   'bob123',   'user');
