--
-- PostgreSQL database dump
--

\restrict YvoxoGhx91b2WRGnTO9xr5T29YCM9cieUzvjasVxxTRwUwsdRS6O1wgwwDtYtxt

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: features; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.features (id, name, slug, description, value_type, is_active, created_at, updated_at) VALUES ('670f6afb-647c-42f2-b61f-fbbdbe8f47a5', 'API Access', 'api_access', 'Access to the PromiseFlow API', 'boolean', true, '2026-09-03 20:48:35.442139+02', '2026-09-03 20:48:35.442139+02');
INSERT INTO public.features (id, name, slug, description, value_type, is_active, created_at, updated_at) VALUES ('ae1dedea-e1d5-460e-a7cb-e1893a108390', 'Team Members', 'team_members', 'Maximum number of team members allowed', 'number', true, '2026-09-03 21:14:27.888711+02', '2026-09-03 21:14:27.888711+02');
INSERT INTO public.features (id, name, slug, description, value_type, is_active, created_at, updated_at) VALUES ('73d5a1ea-11ad-43e5-85f0-7a2e05e8c183', 'Maximum Projects', 'max_projects', 'Maximum number of active projects per organization', 'number', true, '2026-11-15 22:57:54.983431+01', '2026-11-15 22:57:54.983431+01');
INSERT INTO public.features (id, name, slug, description, value_type, is_active, created_at, updated_at) VALUES ('d6a20d93-50d6-4317-ac4a-eeca8354d684', 'Maximum Members', 'max_members', 'Maximum number of active members per organization, including the administrator', 'number', true, '2026-11-19 21:08:24.613076+01', '2026-11-19 21:08:24.613076+01');


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.migrations (id, "timestamp", name) VALUES (1, 1788815824923, 'AddRoleToMemberships1788815824923');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (2, 1788855661445, 'AddAcceptInvitationFunction1788855661445');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (3, 1788950312670, 'AddUserAuthFunctions1788950312670');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (4, 1788951537639, 'AddUserLoginFunction1788951537639');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (5, 1789065988874, 'SeedPermissions1789065988874');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (6, 1789068267102, 'AddSessionWritePolicies1789068267102');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (7, 1789322208714, 'AddOrganizationMemberDirectoryFunction1789322208714');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (8, 1789328665779, 'AddCreateActivityFunction1789328665779');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (9, 1789330223679, 'AddRequestedByToApprovals1789330223679');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (10, 1789330633196, 'AddCreateNotificationFunction1789330633196');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (11, 1789333287813, 'AddTargetPathToNotifications1789333287813');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (12, 1789464833471, 'AddMetadataToNotifications1789464833471');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (13, 1789479843436, 'UpdateCreateNotificationWithMetadata1789479843436');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (14, 1790000000000, 'AddSoftDeleteNotificationFunction1790000000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (15, 1790001000000, 'AddAutomationRunsWritePolicies1790001000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (16, 1792100000000, 'AddUpdateCurrentUserProfile1792100000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (17, 1792200000000, 'SecureMembershipWrites1792200000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (18, 1792201000000, 'SecureRoleWrites1792201000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (19, 1792202000000, 'AddOrganizationUpdatePermission1792202000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (20, 1792900000000, 'PreventRevokedInvitationAcceptance1792900000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (21, 1793200000000, 'GrantAdministratorManagementPermissions1793200000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (22, 1793300000000, 'SecureInvitationPermissions1793300000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (23, 1793400000000, 'SecureInvitationAcceptance1793400000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (24, 1793500000000, 'SecureAuditLogs1793500000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (25, 1793600000000, 'SecureUserAuthentication1793600000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (26, 1793700000000, 'SecureNotifications1793700000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (27, 1793800000000, 'RestrictLegacyNotificationExecute1793800000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (28, 1793900000000, 'SecureTeamMembers1793900000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (29, 1794000000000, 'FixTeamMemberEligibilityCheck1794000000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (30, 1794100000000, 'SecureTeams1794100000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (31, 1794200000000, 'SecureRolesAndPermissions1794200000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (32, 1794300000000, 'PreventInvitationAcceptanceForDeletedOrganizations1794300000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (33, 1794400000000, 'SecurePermissionCatalog1794400000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (34, 1794500000000, 'LockDownSubscriptionWrites1794500000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (35, 1794600000000, 'LockDownPlanCatalogWrites1794600000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (36, 1794700000000, 'AddApiKeysAndWebhooksPermissions1794700000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (37, 1794800000000, 'SecureApiKeysAndWebhooks1794800000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (38, 1794900000000, 'HardenApiKeysWebhooksReadAccess1794900000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (39, 1795000000000, 'AddMaxProjectsUsageLimit1795000000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (40, 1795100000000, 'AddMaxMembersUsageLimit1795100000000');
INSERT INTO public.migrations (id, "timestamp", name) VALUES (41, 1795200000000, 'EnforceMaxMembersOnInvitationAcceptance1795200000000');


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('41f512a7-379a-4f1d-ab5b-a212a497dbe2', 'View Projects', 'projects.read', 'View projects', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('734fc4dc-520a-4f12-8b73-7bac72b04abe', 'Create Projects', 'projects.create', 'Create projects', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('64678a7a-0a44-4e4a-b9f5-f22a8625aac1', 'Update Projects', 'projects.update', 'Update projects', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('fecfb756-c365-499f-b517-79025af267e9', 'Delete Projects', 'projects.delete', 'Delete projects', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('43029af1-a9b0-47d1-a1c8-1cfbe8ce208b', 'View Tasks', 'tasks.read', 'View tasks', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('f818b453-4f46-4f4d-aeb0-aa5d33485e88', 'Create Tasks', 'tasks.create', 'Create tasks', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('a7460cd3-a2f8-47b8-8fe4-f9a05a3f9bee', 'Update Tasks', 'tasks.update', 'Update tasks', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('eeca3f00-4952-4ae5-becc-672275199807', 'Delete Tasks', 'tasks.delete', 'Delete tasks', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('dc973a3d-c428-41a2-95f5-3e6b0d17dcab', 'View Teams', 'teams.read', 'View teams', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('9c7ce069-4822-4fea-8d7f-7090b5e4fbe0', 'Create Teams', 'teams.create', 'Create teams', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('df8b8244-eb14-437c-b3ca-b01a23baff5f', 'Update Teams', 'teams.update', 'Update teams', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('950ad0d7-f0f1-4e16-bdc0-84a8aba9588d', 'Delete Teams', 'teams.delete', 'Delete teams', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('5a4169a1-a32a-49a4-9171-8a431a252dde', 'View Members', 'members.read', 'View organization members', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('07acb67c-853a-497c-9db7-1efada290d9f', 'Manage Members', 'members.manage', 'Manage organization members', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('3b33855c-1316-4951-95a2-af19076d3701', 'View Roles', 'roles.read', 'View organization roles', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('18f1260f-6313-4070-86e6-c53f13b8bc88', 'Manage Roles', 'roles.manage', 'Manage organization roles', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('5aea3222-a008-4b36-bc3d-2aa667d1f2e6', 'View Workflows', 'workflows.read', 'View workflows', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('2e0d0ac2-7316-4847-acca-fe3fe52bf0cc', 'Create Workflows', 'workflows.create', 'Create workflows', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('96b1e0e3-81f3-4f56-b87b-89f1c816c2d4', 'Update Workflows', 'workflows.update', 'Update workflows', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('350853e5-adb2-4d11-abc1-ddfee14a0f38', 'Delete Workflows', 'workflows.delete', 'Delete workflows', '2026-09-10 20:48:24.930734+02', '2026-09-10 20:48:24.930734+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('6daf8a8c-2306-41d7-8c38-e2b9fb24bd6a', 'Update Organization', 'organizations.update', 'Update organization workspace settings', '2026-10-15 02:19:54.837425+02', '2026-10-15 02:19:54.837425+02', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('822c75c5-d9dc-4308-a684-51c2ad016687', 'Read Audit Logs', 'audit_logs.read', 'View organization audit logs', '2026-11-01 21:56:12.588098+01', '2026-11-01 21:56:12.588098+01', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('c2d3ae37-ca27-4eb4-9581-27c4cceb38c5', 'Delete Files', 'files.delete', 'Allows deleting files within an organization', '2026-11-03 18:18:08.336251+01', '2026-11-03 18:18:08.336251+01', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('5b46b36c-246b-4aec-ab56-489381ab5a29', 'Manage API Keys', 'api_keys.manage', 'Create and revoke organization API keys', '2026-11-15 20:13:44.394835+01', '2026-11-15 20:13:44.394835+01', NULL);
INSERT INTO public.permissions (id, name, slug, description, created_at, updated_at, deleted_at) VALUES ('0d69577f-44ee-41e2-981f-9042b5f85027', 'Manage Webhooks', 'webhooks.manage', 'Create, update and deactivate organization webhooks', '2026-11-15 20:13:44.394835+01', '2026-11-15 20:13:44.394835+01', NULL);


--
-- Data for Name: plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.plans (id, name, slug, description, price, currency, billing_interval, is_active, created_at, updated_at) VALUES ('a47aa44e-d371-4b41-bc09-5610e0e18589', 'Pro', 'pro', 'Professional plan for growing teams', 19.99, 'EUR', 'month', true, '2026-09-03 20:38:25.317134+02', '2026-09-03 20:38:25.317134+02');


--
-- Data for Name: plan_features; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.plan_features (id, plan_id, feature_id, value, created_at, updated_at) VALUES ('7cd5dc76-2339-47dd-a933-13f589c00eae', 'a47aa44e-d371-4b41-bc09-5610e0e18589', '670f6afb-647c-42f2-b61f-fbbdbe8f47a5', 'true', '2026-09-03 21:08:12.401128+02', '2026-09-03 21:08:12.401128+02');
INSERT INTO public.plan_features (id, plan_id, feature_id, value, created_at, updated_at) VALUES ('a635b28f-f01a-46b2-9983-7e803fe436c5', 'a47aa44e-d371-4b41-bc09-5610e0e18589', '73d5a1ea-11ad-43e5-85f0-7a2e05e8c183', '10', '2026-11-15 22:57:54.983431+01', '2026-11-15 22:57:54.983431+01');
INSERT INTO public.plan_features (id, plan_id, feature_id, value, created_at, updated_at) VALUES ('ef1f8f51-67f6-4284-a261-f28198cf033b', 'a47aa44e-d371-4b41-bc09-5610e0e18589', 'd6a20d93-50d6-4317-ac4a-eeca8354d684', '10', '2026-11-19 21:08:24.613076+01', '2026-11-19 21:08:24.613076+01');


--
-- Name: migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.migrations_id_seq', 41, true);


--
-- PostgreSQL database dump complete
--

\unrestrict YvoxoGhx91b2WRGnTO9xr5T29YCM9cieUzvjasVxxTRwUwsdRS6O1wgwwDtYtxt
