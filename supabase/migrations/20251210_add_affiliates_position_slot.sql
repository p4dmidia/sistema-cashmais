ALTER TABLE affiliates
  ADD COLUMN position_slot SMALLINT NULL CHECK (position_slot >= 0 AND position_slot <= 2);

CREATE INDEX IF NOT EXISTS idx_affiliates_position_slot ON affiliates(position_slot);

CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliates_sponsor_slot
  ON affiliates(sponsor_id, position_slot)
  WHERE position_slot IS NOT NULL;
