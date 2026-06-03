-- Create applications table for student placement applications

CREATE TABLE IF NOT EXISTS applications (
  application_id BIGSERIAL PRIMARY KEY,
  student_id BIGINT NOT NULL,
  org_id BIGINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  skills TEXT NOT NULL,
  supporting_info TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  CONSTRAINT applications_status_check CHECK (status IN ('pending', 'accepted', 'rejected', 'more_info')),
  response_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_org_id ON applications(org_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
