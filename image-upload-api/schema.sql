CREATE DATABASE IF NOT EXISTS image_storage
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE image_storage;

CREATE TABLE IF NOT EXISTS images (
  id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  image_path  VARCHAR(500)    NOT NULL COMMENT 'Relative path from project root, e.g. uploads/2026/07/30/filename.jpg',
  image_name  VARCHAR(255)    NOT NULL COMMENT 'Generated unique filename',
  image_size  INT UNSIGNED    NOT NULL COMMENT 'File size in bytes',
  image_type  VARCHAR(50)     NOT NULL COMMENT 'MIME type, e.g. image/jpeg',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
