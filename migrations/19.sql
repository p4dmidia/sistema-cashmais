
-- Add last_access_at column to affiliates table for tracking activity
ALTER TABLE affiliates ADD COLUMN last_access_at DATETIME;

-- Update existing affiliates with current timestamp
UPDATE affiliates SET last_access_at = CURRENT_TIMESTAMP WHERE last_access_at IS NULL;
