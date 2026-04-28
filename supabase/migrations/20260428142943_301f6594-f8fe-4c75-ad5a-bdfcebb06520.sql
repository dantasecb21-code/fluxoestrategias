REVOKE EXECUTE ON FUNCTION public.get_followed_strategic_ids(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_followed_strategic_ids(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_followed_strategic_ids(uuid) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.can_follow_strategic(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_follow_strategic(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_follow_strategic(uuid, uuid) FROM authenticated;