-- Make refresh_token nullable in google_tokens.
-- Google does not always return a refresh_token (e.g. on re-authentication
-- when one was already issued). Storing only the access_token + expiry is
-- still valid; the sync service will prompt re-auth when refresh is needed.
ALTER TABLE google_tokens
  ALTER COLUMN refresh_token DROP NOT NULL;
