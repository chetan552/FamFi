-- Google OAuth tokens for parent users
CREATE TABLE IF NOT EXISTS google_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE google_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own tokens"
  ON google_tokens FOR ALL
  TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_id = auth.uid()));

-- Map Google Task Lists to FamFi children
CREATE TABLE IF NOT EXISTS google_task_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  google_tasklist_id TEXT NOT NULL,
  google_tasklist_title TEXT NOT NULL,
  child_id UUID REFERENCES users(id) ON DELETE CASCADE,
  default_reward NUMERIC(10,2) DEFAULT 1.00,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(family_id, google_tasklist_id)
);
ALTER TABLE google_task_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can manage mappings"
  ON google_task_mappings FOR ALL
  TO authenticated
  USING (family_id IN (SELECT family_id FROM users WHERE auth_id = auth.uid()));

-- Track which Google Tasks have been synced
ALTER TABLE chores
  ADD COLUMN IF NOT EXISTS google_task_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual'
    CHECK (source IN ('manual', 'google_tasks'));
