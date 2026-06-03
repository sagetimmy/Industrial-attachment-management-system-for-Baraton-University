-- Create vacancies table
CREATE TABLE public.vacancies (
  vacancy_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  org_id BIGINT NOT NULL REFERENCES public.host_organizations(org_id) ON DELETE CASCADE,
  role_title VARCHAR(255) NOT NULL,
  department VARCHAR(100) NOT NULL,
  available_slots INTEGER NOT NULL CHECK (available_slots > 0),
  application_deadline DATE NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'closed', 'filled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on org_id for faster queries
CREATE INDEX idx_vacancies_org_id ON public.vacancies(org_id);
CREATE INDEX idx_vacancies_status ON public.vacancies(status);

-- Enable RLS
ALTER TABLE public.vacancies ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Host organizations can only view/edit their own vacancies
CREATE POLICY "Organizations can view their own vacancies"
  ON public.vacancies
  FOR SELECT
  USING (org_id IN (
    SELECT org_id FROM public.host_organizations 
    WHERE user_id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Organizations can create vacancies"
  ON public.vacancies
  FOR INSERT
  WITH CHECK (org_id IN (
    SELECT org_id FROM public.host_organizations 
    WHERE user_id = auth.uid()
  ));

CREATE POLICY "Organizations can update their own vacancies"
  ON public.vacancies
  FOR UPDATE
  USING (org_id IN (
    SELECT org_id FROM public.host_organizations 
    WHERE user_id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin')
  WITH CHECK (org_id IN (
    SELECT org_id FROM public.host_organizations 
    WHERE user_id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Organizations can delete their own vacancies"
  ON public.vacancies
  FOR DELETE
  USING (org_id IN (
    SELECT org_id FROM public.host_organizations 
    WHERE user_id = auth.uid()
  ) OR auth.jwt() ->> 'role' = 'admin');

-- RLS Policy: Students can view open vacancies (for browsing)
CREATE POLICY "Students can view open vacancies"
  ON public.vacancies
  FOR SELECT
  USING (status = 'open' AND (SELECT role FROM public.users WHERE id = auth.uid()) = 'student');
