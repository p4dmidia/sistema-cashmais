
CREATE TABLE user_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mocha_user_id TEXT NOT NULL UNIQUE,
  cpf TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'affiliate',
  is_active BOOLEAN DEFAULT 1,
  sponsor_id INTEGER,
  company_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_mocha_user_id ON user_profiles(mocha_user_id);
CREATE INDEX idx_user_profiles_cpf ON user_profiles(cpf);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
