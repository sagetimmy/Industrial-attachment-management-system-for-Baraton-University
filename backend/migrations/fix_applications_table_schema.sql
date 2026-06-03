-- Bring existing applications tables in line with the API routes.
-- The live database may have been created with only: id, student_id, status.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.applications') IS NULL THEN
    CREATE TABLE public.applications (
      application_id BIGSERIAL PRIMARY KEY,
      student_id BIGINT NOT NULL,
      org_id BIGINT NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      skills TEXT NOT NULL,
      supporting_info TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      response_message TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      responded_at TIMESTAMPTZ
    );
  ELSE
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'applications'
        AND column_name = 'id'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'applications'
        AND column_name = 'application_id'
    ) THEN
      ALTER TABLE public.applications RENAME COLUMN id TO application_id;
    END IF;

    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS student_id BIGINT;
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS org_id BIGINT;
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS start_date DATE;
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS end_date DATE;
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS skills TEXT;
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS supporting_info TEXT;
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS response_message TEXT;
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;
    ALTER TABLE public.applications ALTER COLUMN status SET DEFAULT 'pending';
    ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
    ALTER TABLE public.applications
      ADD CONSTRAINT applications_status_check
      CHECK (status IN ('pending', 'accepted', 'rejected', 'more_info'));

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'applications'
        AND column_name = 'student_id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.applications ALTER COLUMN student_id DROP NOT NULL;
      ALTER TABLE public.applications ALTER COLUMN student_id TYPE BIGINT USING NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'applications'
        AND column_name = 'org_id'
        AND data_type = 'uuid'
    ) THEN
      ALTER TABLE public.applications ALTER COLUMN org_id DROP NOT NULL;
      ALTER TABLE public.applications ALTER COLUMN org_id TYPE BIGINT USING NULL;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_applications_student_id ON public.applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_org_id ON public.applications(org_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);

COMMIT;
