\set ON_ERROR_STOP on

BEGIN READ ONLY;

DO $verify$
DECLARE
  demo_user_id CONSTANT uuid :=
    'b2ea82be-d491-4a25-84a0-14c965521822';

  demo_org_id CONSTANT uuid :=
    '62bab4f7-be71-44a6-be1f-35f5647e62df';

  demo_role_id CONSTANT uuid :=
    'f1eb53cb-b20c-404a-af31-5aea1330c493';

  actual_permissions text[];
BEGIN

  -- 1. Demo user

  IF NOT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = demo_user_id
      AND email = 'demo@promiseflow.invalid'
      AND password_hash = '!DEMO_LOGIN_DISABLED!'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid demo user';
  END IF;

  RAISE NOTICE 'PASS: Demo user';

  -- 2. Demo organization

  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations
    WHERE id = demo_org_id
      AND slug = 'promiseflow-demo'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid demo organization';
  END IF;

  RAISE NOTICE 'PASS: Demo organization';

  -- 3. Demo role

  IF (
    SELECT count(*)
    FROM public.roles
    WHERE organization_id = demo_org_id
  ) <> 1 OR NOT EXISTS (
    SELECT 1
    FROM public.roles
    WHERE id = demo_role_id
      AND organization_id = demo_org_id
      AND slug = 'demo-viewer'
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Invalid demo role';
  END IF;

  RAISE NOTICE 'PASS: Demo role';

  -- 4. Membership isolation

  IF (
    SELECT count(*)
    FROM public.memberships
    WHERE user_id = demo_user_id
  ) <> 1 OR (
    SELECT count(*)
    FROM public.memberships
    WHERE organization_id = demo_org_id
  ) <> 1 OR NOT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = demo_user_id
      AND organization_id = demo_org_id
      AND role_id = demo_role_id
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Demo membership isolation failed';
  END IF;

  RAISE NOTICE 'PASS: Membership isolation';

  -- 5. Exact read-only permissions

  SELECT array_agg(p.slug::text ORDER BY p.slug)
  INTO actual_permissions
  FROM public.role_permissions rp
  JOIN public.permissions p
    ON p.id = rp.permission_id
  WHERE rp.role_id = demo_role_id
    AND p.deleted_at IS NULL;

  IF actual_permissions IS DISTINCT FROM ARRAY[
    'members.read',
    'projects.read',
    'roles.read',
    'tasks.read',
    'teams.read',
    'workflows.read'
  ]::text[] OR (
    SELECT count(*)
    FROM public.role_permissions
    WHERE role_id = demo_role_id
  ) <> 6 THEN
    RAISE EXCEPTION 'Invalid demo permissions';
  END IF;

  RAISE NOTICE 'PASS: Exact read-only permissions';

  -- 6. Projects

  IF (
    SELECT count(*)
    FROM public.projects
    WHERE organization_id = demo_org_id
      AND deleted_at IS NULL
  ) <> 3 THEN
    RAISE EXCEPTION 'Invalid demo project count';
  END IF;

  RAISE NOTICE 'PASS: 3 projects';

  -- 7. Teams

  IF (
    SELECT count(*)
    FROM public.teams
    WHERE organization_id = demo_org_id
      AND deleted_at IS NULL
  ) <> 3 THEN
    RAISE EXCEPTION 'Invalid demo team count';
  END IF;

  RAISE NOTICE 'PASS: 3 teams';

  -- 8. Tasks

  IF (
    SELECT count(*)
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE p.organization_id = demo_org_id
      AND p.deleted_at IS NULL
      AND t.deleted_at IS NULL
  ) <> 12 THEN
    RAISE EXCEPTION 'Invalid demo task count';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    WHERE p.organization_id = demo_org_id
      AND t.assigned_to_user_id IS NOT NULL
      AND t.assigned_to_user_id <> demo_user_id
  ) THEN
    RAISE EXCEPTION 'Foreign user assigned to demo task';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.projects p ON p.id = t.project_id
    LEFT JOIN public.workflow_steps s
      ON s.id = t.workflow_step_id
    LEFT JOIN public.workflows w
      ON w.id = s.workflow_id
    WHERE p.organization_id = demo_org_id
      AND t.workflow_step_id IS NOT NULL
      AND (
        w.project_id IS DISTINCT FROM t.project_id
        OR s.deleted_at IS NOT NULL
        OR w.deleted_at IS NOT NULL
      )
  ) THEN
    RAISE EXCEPTION 'Invalid task workflow relationship';
  END IF;

  RAISE NOTICE 'PASS: 12 tasks and valid assignments';

  -- 9. Workflows

  IF (
    SELECT count(*)
    FROM public.workflows w
    JOIN public.projects p ON p.id = w.project_id
    WHERE p.organization_id = demo_org_id
      AND p.deleted_at IS NULL
      AND w.deleted_at IS NULL
  ) <> 2 THEN
    RAISE EXCEPTION 'Invalid demo workflow count';
  END IF;

  RAISE NOTICE 'PASS: 2 workflows';

  -- 10. Workflow steps

  IF (
    SELECT count(*)
    FROM public.workflow_steps s
    JOIN public.workflows w ON w.id = s.workflow_id
    JOIN public.projects p ON p.id = w.project_id
    WHERE p.organization_id = demo_org_id
      AND p.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND s.deleted_at IS NULL
  ) <> 9 THEN
    RAISE EXCEPTION 'Invalid workflow step count';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workflow_steps s
    JOIN public.workflows w ON w.id = s.workflow_id
    JOIN public.projects p ON p.id = w.project_id
    WHERE p.organization_id = demo_org_id
      AND p.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND s.deleted_at IS NULL
    GROUP BY s.workflow_id
    HAVING min(s.position) <> 0
       OR max(s.position) <> count(*) - 1
       OR count(DISTINCT s.position) <> count(*)
  ) THEN
    RAISE EXCEPTION 'Invalid workflow step positions';
  END IF;

  RAISE NOTICE 'PASS: 9 workflow steps and valid positions';

  -- 11. Workflow transitions

  IF (
    SELECT count(*)
    FROM public.workflow_transitions t
    JOIN public.workflows w ON w.id = t.workflow_id
    JOIN public.projects p ON p.id = w.project_id
    WHERE p.organization_id = demo_org_id
      AND p.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND t.deleted_at IS NULL
  ) <> 7 THEN
    RAISE EXCEPTION 'Invalid workflow transition count';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.workflow_transitions t
    JOIN public.workflows w ON w.id = t.workflow_id
    JOIN public.projects p ON p.id = w.project_id
    JOIN public.workflow_steps fs ON fs.id = t.from_step_id
    JOIN public.workflow_steps ts ON ts.id = t.to_step_id
    WHERE p.organization_id = demo_org_id
      AND t.deleted_at IS NULL
      AND (
        fs.workflow_id <> t.workflow_id
        OR ts.workflow_id <> t.workflow_id
        OR fs.deleted_at IS NOT NULL
        OR ts.deleted_at IS NOT NULL
        OR ts.position <> fs.position + 1
      )
  ) THEN
    RAISE EXCEPTION 'Invalid workflow transition relationship';
  END IF;

  RAISE NOTICE 'PASS: 7 workflow transitions';

  RAISE NOTICE 'ALL DEMO DATA VERIFICATION CHECKS PASSED';

END
$verify$;

COMMIT;