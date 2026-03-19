-- ============================================================
-- FamFi Database Schema — Initial Migration
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('parent', 'child');
CREATE TYPE transaction_type AS ENUM ('chore_earning', 'gift', 'interest', 'parent_match', 'adjustment');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed');
CREATE TYPE chore_status AS ENUM ('assigned', 'done', 'approved', 'paid');

-- ============================================================
-- TABLES
-- ============================================================

-- Families
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_families_invite_code ON families(invite_code);

-- Users (parents and children)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  auth_id UUID REFERENCES auth.users(id) UNIQUE,
  role user_role NOT NULL DEFAULT 'parent',
  name TEXT NOT NULL,
  avatar_emoji TEXT NOT NULL DEFAULT '😊',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_family_id ON users(family_id);
CREATE INDEX idx_users_auth_id ON users(auth_id);

-- Bucket Templates
CREATE TABLE bucket_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '💰',
  color TEXT NOT NULL DEFAULT '#2B9EB3',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bucket_templates_family_id ON bucket_templates(family_id);

-- Buckets (one per child × template × month)
CREATE TABLE buckets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES bucket_templates(id) ON DELETE CASCADE,
  month INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  year INT NOT NULL CHECK (year >= 2024),
  cached_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  UNIQUE (child_id, template_id, month, year)
);

CREATE INDEX idx_buckets_child_id ON buckets(child_id);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bucket_id UUID NOT NULL REFERENCES buckets(id) ON DELETE CASCADE,
  child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL,
  type transaction_type NOT NULL,
  description TEXT,
  status transaction_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_bucket_id ON transactions(bucket_id);
CREATE INDEX idx_transactions_child_id ON transactions(child_id);

-- Chores
CREATE TABLE chores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  assigned_to_child_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  status chore_status NOT NULL DEFAULT 'assigned',
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chores_family_id ON chores(family_id);
CREATE INDEX idx_chores_child_id ON chores(assigned_to_child_id);

-- Interest Settings (per family × bucket template)
CREATE TABLE interest_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES bucket_templates(id) ON DELETE CASCADE,
  rate_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  match_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (family_id, template_id)
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Recalculate bucket balance from transactions
CREATE OR REPLACE FUNCTION recalculate_bucket_balance(bucket_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE buckets
  SET cached_balance = COALESCE(
    (SELECT SUM(amount) FROM transactions WHERE bucket_id = bucket_uuid AND status = 'completed'),
    0.00
  )
  WHERE id = bucket_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: auto-recalculate after transaction changes
CREATE OR REPLACE FUNCTION trigger_recalculate_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_bucket_balance(OLD.bucket_id);
    RETURN OLD;
  ELSE
    PERFORM recalculate_bucket_balance(NEW.bucket_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_transactions_balance
AFTER INSERT OR UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_balance();

-- ============================================================
-- HELPER: get family_id for the current auth user
-- ============================================================

CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_my_user_id()
RETURNS UUID AS $$
  SELECT id FROM users WHERE auth_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bucket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE interest_settings ENABLE ROW LEVEL SECURITY;

-- ---- families ----

CREATE POLICY "Parents can view own family"
  ON families FOR SELECT
  USING (id = get_my_family_id() OR created_by = auth.uid());

CREATE POLICY "Authenticated users can create families"
  ON families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Parents can update own family"
  ON families FOR UPDATE
  USING (id = get_my_family_id() AND get_my_role() = 'parent');

-- ---- users ----

-- Allow new signups to insert their own profile (no family yet)
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth_id = auth.uid());

-- Parents can insert children into their family
CREATE POLICY "Parents can insert children"
  ON users FOR INSERT
  WITH CHECK (
    family_id = get_my_family_id()
    AND get_my_role() = 'parent'
    AND role = 'child'
  );

-- Parents can view all users in their family; everyone can see themselves
CREATE POLICY "Users can view family members"
  ON users FOR SELECT
  USING (
    auth_id = auth.uid()
    OR family_id = get_my_family_id()
  );

-- Parents can update users in their family (including setting family_id on self)
CREATE POLICY "Parents can update family users"
  ON users FOR UPDATE
  USING (
    auth_id = auth.uid()
    OR (family_id = get_my_family_id() AND get_my_role() = 'parent')
  );

-- Parents can delete children in their family
CREATE POLICY "Parents can delete family children"
  ON users FOR DELETE
  USING (
    family_id = get_my_family_id()
    AND get_my_role() = 'parent'
    AND role = 'child'
  );

-- ---- bucket_templates ----

CREATE POLICY "Family members can view bucket templates"
  ON bucket_templates FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Parents can insert bucket templates"
  ON bucket_templates FOR INSERT
  WITH CHECK (family_id = get_my_family_id() AND get_my_role() = 'parent');

CREATE POLICY "Parents can update bucket templates"
  ON bucket_templates FOR UPDATE
  USING (family_id = get_my_family_id() AND get_my_role() = 'parent');

CREATE POLICY "Parents can delete bucket templates"
  ON bucket_templates FOR DELETE
  USING (family_id = get_my_family_id() AND get_my_role() = 'parent');

-- ---- buckets ----

CREATE POLICY "Parents can view all family buckets"
  ON buckets FOR SELECT
  USING (
    child_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
  );

CREATE POLICY "Parents can insert buckets"
  ON buckets FOR INSERT
  WITH CHECK (
    get_my_role() = 'parent'
    AND child_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
  );

CREATE POLICY "Parents can update buckets"
  ON buckets FOR UPDATE
  USING (
    get_my_role() = 'parent'
    AND child_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
  );

-- ---- transactions ----

CREATE POLICY "Parents can view family transactions"
  ON transactions FOR SELECT
  USING (
    child_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
  );

CREATE POLICY "Parents can insert transactions"
  ON transactions FOR INSERT
  WITH CHECK (
    get_my_role() = 'parent'
    AND child_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
  );

CREATE POLICY "Parents can update transactions"
  ON transactions FOR UPDATE
  USING (
    get_my_role() = 'parent'
    AND child_id IN (SELECT id FROM users WHERE family_id = get_my_family_id())
  );

-- ---- chores ----

CREATE POLICY "Family members can view chores"
  ON chores FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Parents can insert chores"
  ON chores FOR INSERT
  WITH CHECK (family_id = get_my_family_id() AND get_my_role() = 'parent');

CREATE POLICY "Parents can update chores"
  ON chores FOR UPDATE
  USING (family_id = get_my_family_id() AND get_my_role() = 'parent');

-- Children can mark their own chores as done (assigned → done only)
CREATE POLICY "Children can mark own chores done"
  ON chores FOR UPDATE
  USING (
    assigned_to_child_id = get_my_user_id()
    AND get_my_role() = 'child'
    AND status = 'assigned'
  )
  WITH CHECK (status = 'done');

CREATE POLICY "Parents can delete chores"
  ON chores FOR DELETE
  USING (family_id = get_my_family_id() AND get_my_role() = 'parent');

-- ---- interest_settings ----

CREATE POLICY "Family members can view interest settings"
  ON interest_settings FOR SELECT
  USING (family_id = get_my_family_id());

CREATE POLICY "Parents can insert interest settings"
  ON interest_settings FOR INSERT
  WITH CHECK (family_id = get_my_family_id() AND get_my_role() = 'parent');

CREATE POLICY "Parents can update interest settings"
  ON interest_settings FOR UPDATE
  USING (family_id = get_my_family_id() AND get_my_role() = 'parent');

CREATE POLICY "Parents can delete interest settings"
  ON interest_settings FOR DELETE
  USING (family_id = get_my_family_id() AND get_my_role() = 'parent');
