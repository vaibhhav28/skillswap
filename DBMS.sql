CREATE DATABASE IF NOT EXISTS skillswap
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE skillswap;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  bio VARCHAR(500) DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id INT NOT NULL,
  skill_id INT NOT NULL,
  skill_type ENUM('offer','want') NOT NULL,
  level TINYINT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (user_id, skill_id, skill_type),

  CONSTRAINT fk_user_skills_user
    FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_user_skills_skill
    FOREIGN KEY (skill_id) REFERENCES skills(id)
    ON DELETE CASCADE
);

CREATE INDEX idx_user_skills_user_type ON user_skills(user_id, skill_type);
CREATE INDEX idx_user_skills_skill_type ON user_skills(skill_id, skill_type);

CREATE USER IF NOT EXISTS 'skillswap_user'@'localhost' IDENTIFIED BY 'StrongPassword123!';
GRANT ALL PRIVILEGES ON skillswap.* TO 'skillswap_user'@'localhost';
FLUSH PRIVILEGES;