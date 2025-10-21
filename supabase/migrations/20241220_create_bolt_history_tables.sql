-- Migration pour créer les tables boltHistory dans Supabase
-- Remplace complètement IndexedDB par Supabase

-- Table des chats (remplace IndexedDB chats)
CREATE TABLE IF NOT EXISTS chats (
  id text PRIMARY KEY,
  user_id text NOT NULL DEFAULT 'anonymous-user',
  url_id text,
  description text,
  messages jsonb NOT NULL,
  timestamp timestamptz DEFAULT now(),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des snapshots (remplace IndexedDB snapshots)
CREATE TABLE IF NOT EXISTS snapshots (
  chat_id text PRIMARY KEY,
  chat_index text NOT NULL,
  files jsonb NOT NULL,
  summary text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chats_timestamp ON chats(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_chats_url_id ON chats(url_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_chat_id ON snapshots(chat_id);

-- Désactiver RLS pour permettre l'accès anonyme (comme IndexedDB)
ALTER TABLE chats DISABLE ROW LEVEL SECURITY;
ALTER TABLE snapshots DISABLE ROW LEVEL SECURITY;

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_snapshots_updated_at
  BEFORE UPDATE ON snapshots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
