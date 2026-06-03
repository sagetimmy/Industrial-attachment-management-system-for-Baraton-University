-- Approve all host organizations so they appear in student's Apply screen
-- This is a temporary fix for testing. In production, use the admin dashboard to approve organizations.

UPDATE public.host_organizations
SET is_approved = true
WHERE is_approved = false OR is_approved IS NULL;

-- Verify the update
SELECT org_id, org_name, is_approved FROM public.host_organizations;
