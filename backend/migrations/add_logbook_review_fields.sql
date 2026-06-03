ALTER TABLE logbook_entries
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

ALTER TABLE logbook_entries
  ADD COLUMN IF NOT EXISTS supervisor_score NUMERIC,
  ADD COLUMN IF NOT EXISTS supervisor_feedback TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'logbook_entries_status_check'
  ) THEN
    ALTER TABLE logbook_entries
      ADD CONSTRAINT logbook_entries_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'revision'));
  END IF;
END $$;
