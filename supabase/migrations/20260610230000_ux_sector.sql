-- Add ux_leader and ux_collaborator roles
-- NOTE: policies using these new enum values are in the next migration (230001)
-- because PostgreSQL does not allow using a new enum value in the same transaction
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ux_leader';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ux_collaborator';
