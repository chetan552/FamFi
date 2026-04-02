-- Migration: Add performance indexes for common query patterns
-- These indexes optimize the most frequent queries in the application.

-- Composite index for bucket lookups by child + month + year
-- Used in fetchFamily() to load current month's buckets
CREATE INDEX IF NOT EXISTS idx_buckets_child_month_year 
  ON buckets(child_id, month, year);

-- Composite index for transaction ordering
-- Used when fetching recent transactions sorted by created_at
CREATE INDEX IF NOT EXISTS idx_transactions_bucket_created 
  ON transactions(bucket_id, created_at DESC);

-- Index for chore status filtering
-- Used when filtering chores by status (assigned, done, approved, paid)
CREATE INDEX IF NOT EXISTS idx_chores_status 
  ON chores(family_id, status);

-- Index for Google task mappings by family
CREATE INDEX IF NOT EXISTS idx_google_task_mappings_family 
  ON google_task_mappings(family_id);
