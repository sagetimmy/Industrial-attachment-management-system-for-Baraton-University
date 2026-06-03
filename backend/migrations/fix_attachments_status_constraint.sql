-- Fix attachments status check constraint
-- The attachments table needs to allow: pending, approved, ongoing, completed, rejected

-- Drop the old constraint (if it exists) and create a new one with all valid statuses
-- First, create the new constraint
ALTER TABLE public.attachments
DROP CONSTRAINT IF EXISTS attachments_status_check;

ALTER TABLE public.attachments
ADD CONSTRAINT attachments_status_check 
CHECK (status IN ('pending', 'approved', 'ongoing', 'completed', 'rejected'));

-- Verify the constraint is in place
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'attachments' AND constraint_name LIKE '%status%';
