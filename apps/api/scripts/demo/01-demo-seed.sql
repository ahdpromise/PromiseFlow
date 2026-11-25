BEGIN;
SET LOCAL search_path = public, pg_catalog;

DO $demo$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.users
    WHERE id = 'b2ea82be-d491-4a25-84a0-14c965521822'
       OR lower(email) = 'demo@promiseflow.invalid'
  ) OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = '62bab4f7-be71-44a6-be1f-35f5647e62df'
       OR slug = 'promiseflow-demo'
  ) THEN
    RAISE EXCEPTION 'Demo identity already exists. No changes applied.';
  END IF;

  IF (
    SELECT count(*)
    FROM public.permissions
    WHERE deleted_at IS NULL
    AND slug IN (
      'members.read',
      'projects.read',
      'roles.read',
      'tasks.read',
      'teams.read',
      'workflows.read'
    )
  ) <> 6 THEN
    RAISE EXCEPTION 'Required demo permissions are missing or duplicated.';
  END IF;
END
$demo$;

INSERT INTO public.users (id, first_name, last_name, email, password_hash) VALUES ('b2ea82be-d491-4a25-84a0-14c965521822', 'Demo', 'User', 'demo@promiseflow.invalid', '!DEMO_LOGIN_DISABLED!');
INSERT INTO public.organizations (id, name, slug) VALUES ('62bab4f7-be71-44a6-be1f-35f5647e62df', 'PromiseFlow Demo', 'promiseflow-demo');
INSERT INTO public.roles (id, organization_id, name, slug, description) VALUES ('f1eb53cb-b20c-404a-af31-5aea1330c493', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'Demo Viewer', 'demo-viewer', 'Restricted read-only demonstration role');
INSERT INTO public.memberships (id, user_id, organization_id, role_id) VALUES ('979bf936-09ec-4e0b-961e-845df793e78e', 'b2ea82be-d491-4a25-84a0-14c965521822', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'f1eb53cb-b20c-404a-af31-5aea1330c493');
INSERT INTO public.role_permissions (id, role_id, permission_id) SELECT '8a21053f-d071-4b64-8a35-9e10b1d063fa', 'f1eb53cb-b20c-404a-af31-5aea1330c493', id FROM public.permissions WHERE slug = 'members.read' AND deleted_at IS NULL;
INSERT INTO public.role_permissions (id, role_id, permission_id) SELECT '2004b54a-9a32-4b5c-80c3-bab931dbc66d', 'f1eb53cb-b20c-404a-af31-5aea1330c493', id FROM public.permissions WHERE slug = 'projects.read' AND deleted_at IS NULL;
INSERT INTO public.role_permissions (id, role_id, permission_id) SELECT 'd4fbbc3d-4995-4d59-813d-cb4bbc3c5840', 'f1eb53cb-b20c-404a-af31-5aea1330c493', id FROM public.permissions WHERE slug = 'roles.read' AND deleted_at IS NULL;
INSERT INTO public.role_permissions (id, role_id, permission_id) SELECT 'd2da54e5-cd0e-4773-960c-bd9df429fa05', 'f1eb53cb-b20c-404a-af31-5aea1330c493', id FROM public.permissions WHERE slug = 'tasks.read' AND deleted_at IS NULL;
INSERT INTO public.role_permissions (id, role_id, permission_id) SELECT '91ede0aa-375f-4473-8602-5febf5251ad7', 'f1eb53cb-b20c-404a-af31-5aea1330c493', id FROM public.permissions WHERE slug = 'teams.read' AND deleted_at IS NULL;
INSERT INTO public.role_permissions (id, role_id, permission_id) SELECT '7abd9f38-b79a-4357-ad5b-d32f539a32c4', 'f1eb53cb-b20c-404a-af31-5aea1330c493', id FROM public.permissions WHERE slug = 'workflows.read' AND deleted_at IS NULL;
INSERT INTO public.projects (id, organization_id, name, slug, description) VALUES ('82ee0596-6d26-4dc2-a5aa-5f560387fda3', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'Customer Portal', 'customer-portal', 'Development of a modern customer self-service platform.');
INSERT INTO public.projects (id, organization_id, name, slug, description) VALUES ('64b04ceb-fa21-4b63-874c-9ff70e317bf8', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'Internal Operations', 'internal-operations', 'Improving internal processes and operational efficiency.');
INSERT INTO public.projects (id, organization_id, name, slug, description) VALUES ('f1ebbfb5-66fc-4f80-85ac-2bcfc147fbd3', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'Product Launch', 'product-launch', 'Planning and coordination of a new product release.');
INSERT INTO public.teams (id, organization_id, name, slug, description) VALUES ('add02653-1ca4-463e-a3f6-82c6e329a943', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'Engineering', 'engineering', 'Software development and technical infrastructure.');
INSERT INTO public.teams (id, organization_id, name, slug, description) VALUES ('e542767e-de39-4cef-a5b4-0a9d6c578b3d', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'Operations', 'operations', 'Business processes and operational coordination.');
INSERT INTO public.teams (id, organization_id, name, slug, description) VALUES ('7c739dbf-21c5-402b-a3d4-a0ed86d4292b', '62bab4f7-be71-44a6-be1f-35f5647e62df', 'Product & Design', 'product-design', 'Product strategy and user experience design.');
INSERT INTO public.workflows (id, project_id, name, slug, description) VALUES ('58ff68c0-d50f-4828-9bcf-1f71ca4b6087', 'f1ebbfb5-66fc-4f80-85ac-2bcfc147fbd3', 'Launch Approval', 'launch-approval', 'Product launch review and approval process.');
INSERT INTO public.workflows (id, project_id, name, slug, description) VALUES ('1bd94986-d74e-4ff6-9e7b-171eef705ed7', '82ee0596-6d26-4dc2-a5aa-5f560387fda3', 'Software Delivery', 'software-delivery', 'Structured software development and delivery process.');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('33f9db45-fa3e-4d07-bcaa-af4a982dd909', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', 'Planning', 'planning', 'Define requirements and delivery scope.', 'approval', '0');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('a848e741-9d24-4413-9b6b-d564bf40cd97', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', 'Development', 'development', 'Implement the planned features.', 'approval', '1');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('55d13fba-8102-434e-809a-f89bba2a5154', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', 'Code Review', 'code-review', 'Review implementation and code quality.', 'approval', '2');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('c4b5ebc9-209c-4262-aeeb-fd9bc1883064', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', 'Testing', 'testing', 'Validate functionality and reliability.', 'approval', '3');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('9ba2bc91-9113-41ef-a45c-8926fe1e5263', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', 'Deployment', 'deployment', 'Approve the release for production.', 'approval', '4');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('abcbefab-3e5b-4702-9258-d695b0e4aea5', '58ff68c0-d50f-4828-9bcf-1f71ca4b6087', 'Draft', 'draft', 'Prepare the product launch proposal.', 'approval', '0');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('736cef9c-d5e5-4d8b-8f34-ac83d0da2772', '58ff68c0-d50f-4828-9bcf-1f71ca4b6087', 'Review', 'review', 'Review the launch requirements.', 'approval', '1');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('44ef9908-5fc4-4d3f-af64-83af36ae9adb', '58ff68c0-d50f-4828-9bcf-1f71ca4b6087', 'Approval', 'approval', 'Approve the final launch plan.', 'approval', '2');
INSERT INTO public.workflow_steps (id, workflow_id, name, slug, description, step_type, position) VALUES ('932f1f2b-e8fc-4d57-bd73-f96001881675', '58ff68c0-d50f-4828-9bcf-1f71ca4b6087', 'Launch', 'launch', 'Confirm readiness for launch.', 'approval', '3');
INSERT INTO public.workflow_transitions (id, workflow_id, from_step_id, to_step_id, name, slug, condition) VALUES ('4e374534-bea9-478c-b977-febbdf31bd02', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', '55d13fba-8102-434e-809a-f89bba2a5154', 'c4b5ebc9-209c-4262-aeeb-fd9bc1883064', 'Code Review to Testing', 'code-review-to-testing', NULL);
INSERT INTO public.workflow_transitions (id, workflow_id, from_step_id, to_step_id, name, slug, condition) VALUES ('62fcdfd5-fc12-4fc0-90e5-44bf9c011c19', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', 'a848e741-9d24-4413-9b6b-d564bf40cd97', '55d13fba-8102-434e-809a-f89bba2a5154', 'Development to Code Review', 'development-to-code-review', NULL);
INSERT INTO public.workflow_transitions (id, workflow_id, from_step_id, to_step_id, name, slug, condition) VALUES ('664735c3-06bc-450c-ae97-cd3fe962efe2', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', '33f9db45-fa3e-4d07-bcaa-af4a982dd909', 'a848e741-9d24-4413-9b6b-d564bf40cd97', 'Planning to Development', 'planning-to-development', NULL);
INSERT INTO public.workflow_transitions (id, workflow_id, from_step_id, to_step_id, name, slug, condition) VALUES ('b6ce9836-c630-432f-b47e-16cb61f35c4e', '1bd94986-d74e-4ff6-9e7b-171eef705ed7', 'c4b5ebc9-209c-4262-aeeb-fd9bc1883064', '9ba2bc91-9113-41ef-a45c-8926fe1e5263', 'Testing to Deployment', 'testing-to-deployment', NULL);
INSERT INTO public.workflow_transitions (id, workflow_id, from_step_id, to_step_id, name, slug, condition) VALUES ('aa5deb78-6dff-44d8-8177-3cc3abd4dafb', '58ff68c0-d50f-4828-9bcf-1f71ca4b6087', '44ef9908-5fc4-4d3f-af64-83af36ae9adb', '932f1f2b-e8fc-4d57-bd73-f96001881675', 'Approval to Launch', 'approval-to-launch', NULL);
INSERT INTO public.workflow_transitions (id, workflow_id, from_step_id, to_step_id, name, slug, condition) VALUES ('cb854231-8bbb-47fa-b695-105cdffb63e5', '58ff68c0-d50f-4828-9bcf-1f71ca4b6087', 'abcbefab-3e5b-4702-9258-d695b0e4aea5', '736cef9c-d5e5-4d8b-8f34-ac83d0da2772', 'Draft to Review', 'draft-to-review', NULL);
INSERT INTO public.workflow_transitions (id, workflow_id, from_step_id, to_step_id, name, slug, condition) VALUES ('8a651132-607e-4ae0-805c-2f76b42123db', '58ff68c0-d50f-4828-9bcf-1f71ca4b6087', '736cef9c-d5e5-4d8b-8f34-ac83d0da2772', '44ef9908-5fc4-4d3f-af64-83af36ae9adb', 'Review to Approval', 'review-to-approval', NULL);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('6b718d0c-2428-4efe-98d0-2f5914fe02e6', '64b04ceb-fa21-4b63-874c-9ff70e317bf8', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Automate recurring reports', 'Reduce manual reporting tasks.', 'in_progress', 'high', now() + '4 days 21:57:13.477514'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('d2472861-f6df-43c5-9e9a-83a39b4a9be4', '64b04ceb-fa21-4b63-874c-9ff70e317bf8', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Review internal processes', 'Identify operational improvements.', 'completed', 'medium', now() + '-5 days -02:02:46.522486'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('2d114e62-bce6-46f1-bd00-b2e443ea3d12', '64b04ceb-fa21-4b63-874c-9ff70e317bf8', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Review team performance', 'Evaluate operational performance indicators.', 'pending', 'medium', now() + '11 days 21:57:13.477514'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('49256405-8f88-4db2-b18c-24e72572b3a9', '64b04ceb-fa21-4b63-874c-9ff70e317bf8', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Update documentation', 'Maintain internal process documentation.', 'pending', 'low', now() + '7 days 21:57:13.477514'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('dd6f7a98-18ab-4e64-85c1-35174deab061', '82ee0596-6d26-4dc2-a5aa-5f560387fda3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Accessibility testing', 'Verify accessibility and responsive behavior.', 'pending', 'medium', now() + '6 days 21:57:13.477514'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('7d4025b7-9d1f-4657-870d-5db646715fa3', '82ee0596-6d26-4dc2-a5aa-5f560387fda3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Design customer dashboard', 'Create responsive dashboard layouts.', 'completed', 'high', now() + '-3 days -02:02:46.522486'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('0f62f1e0-1c1d-4bec-a61b-d396d77d2537', '82ee0596-6d26-4dc2-a5aa-5f560387fda3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Implement authentication', 'Implement secure customer authentication.', 'completed', 'high', now() + '-1 days -02:02:46.522486'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('8a1682e4-41be-41a2-815e-7b68ece4d98e', '82ee0596-6d26-4dc2-a5aa-5f560387fda3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Integrate REST API', 'Connect frontend components to backend services.', 'in_progress', 'high', now() + '2 days 21:57:13.477514'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('37a1a119-8fc4-4a67-925f-3442ee2408c6', 'f1ebbfb5-66fc-4f80-85ac-2bcfc147fbd3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Define launch requirements', 'Document product launch objectives.', 'completed', 'high', now() + '-2 days -02:02:46.522486'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('a7cb3aa0-a89f-4f3c-a228-bcde23af9d6e', 'f1ebbfb5-66fc-4f80-85ac-2bcfc147fbd3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Prepare marketing materials', 'Create launch communication assets.', 'in_progress', 'medium', now() + '3 days 21:57:13.477514'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('4e393643-d0c8-49f3-a561-4dfa2844e975', 'f1ebbfb5-66fc-4f80-85ac-2bcfc147fbd3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Review release checklist', 'Validate release readiness.', 'pending', 'urgent', now() + '1 day 21:57:13.477514'::interval);
INSERT INTO public.tasks (id, project_id, workflow_step_id, assigned_to_user_id, title, description, status, priority, due_at) VALUES ('ab8f3e03-da8f-415f-88af-078ce8294e31', 'f1ebbfb5-66fc-4f80-85ac-2bcfc147fbd3', NULL, 'b2ea82be-d491-4a25-84a0-14c965521822', 'Schedule product release', 'Coordinate the final release date.', 'pending', 'high', now() + '9 days 21:57:13.477514'::interval);
COMMIT;
