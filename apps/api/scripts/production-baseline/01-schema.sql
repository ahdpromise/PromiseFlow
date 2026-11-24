--
-- PostgreSQL database dump
--

\restrict JFVQdrcmaQweXKiAgevBsLd5vep7HErxMbkcfoV6djNsi0zpakA8oW1YVrvk97f

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
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;


--
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: accept_invitation(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.accept_invitation(p_token text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
          v_user_id uuid;
          v_user_email text;
          v_invitation_id uuid;
          v_organization_id uuid;
          v_role_id uuid;
          v_invitation_email public.citext;
          v_expires_at timestamptz;
          v_accepted_at timestamptz;
          v_revoked_at timestamptz;
          v_membership_id uuid;
      BEGIN
          v_user_id := NULLIF(
              current_setting('app.user_id', true),
              ''
          )::uuid;

          IF v_user_id IS NULL THEN
              RAISE EXCEPTION 'app.user_id is not set';
          END IF;

          SELECT u.email
          INTO v_user_email
          FROM public.users u
          WHERE u.id = v_user_id
            AND u.deleted_at IS NULL;

          IF v_user_email IS NULL THEN
              RAISE EXCEPTION 'Current user not found';
          END IF;

          SELECT
              i.id,
              i.organization_id,
              i.role_id,
              i.email,
              i.expires_at,
              i.accepted_at,
              i.revoked_at
          INTO
              v_invitation_id,
              v_organization_id,
              v_role_id,
              v_invitation_email,
              v_expires_at,
              v_accepted_at,
              v_revoked_at
          FROM public.invitations i
          WHERE i.token = p_token
            AND i.deleted_at IS NULL
          FOR UPDATE;

          IF v_invitation_id IS NULL THEN
              RAISE EXCEPTION 'Invitation not found';
          END IF;

          IF v_accepted_at IS NOT NULL THEN
              RAISE EXCEPTION 'Invitation has already been accepted';
          END IF;

          IF v_revoked_at IS NOT NULL THEN
              RAISE EXCEPTION 'Invitation has been revoked';
          END IF;

          IF v_expires_at <= CURRENT_TIMESTAMP THEN
              RAISE EXCEPTION 'Invitation has expired';
          END IF;

          IF v_invitation_email <> v_user_email::public.citext THEN
              RAISE EXCEPTION 'Invitation email does not match current user';
          END IF;

          IF NOT EXISTS (
              SELECT 1
              FROM public.roles r
              WHERE r.id = v_role_id
                AND r.organization_id = v_organization_id
                AND r.deleted_at IS NULL
          ) THEN
              RAISE EXCEPTION 'Invitation role is invalid';
          END IF;

          IF EXISTS (
              SELECT 1
              FROM public.memberships m
              WHERE m.user_id = v_user_id
                AND m.organization_id = v_organization_id
                AND m.deleted_at IS NULL
          ) THEN
              RAISE EXCEPTION 'User is already a member of this organization';
          END IF;

          INSERT INTO public.memberships (
              user_id,
              organization_id,
              role_id
          )
          VALUES (
              v_user_id,
              v_organization_id,
              v_role_id
          )
          RETURNING id INTO v_membership_id;

          UPDATE public.invitations
          SET accepted_at = CURRENT_TIMESTAMP
          WHERE id = v_invitation_id;

          RETURN v_membership_id;
      END;
      $$;


ALTER FUNCTION public.accept_invitation(p_token text) OWNER TO postgres;

--
-- Name: accept_invitation_with_details(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.accept_invitation_with_details(p_token text) RETURNS TABLE(membership_id uuid, organization_id uuid, invitation_id uuid, email text, role_id uuid)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
      DECLARE
        v_user_id uuid;
        v_user_email text;
        v_invitation_id uuid;
        v_organization_id uuid;
        v_role_id uuid;
        v_invitation_email public.citext;
        v_expires_at timestamptz;
        v_accepted_at timestamptz;
        v_revoked_at timestamptz;
        v_membership_id uuid;

        v_subscription_count integer;
        v_subscription_status text;
        v_period_start timestamptz;
        v_period_end timestamptz;
        v_plan_is_active boolean;
        v_feature_is_active boolean;
        v_feature_value_type text;
        v_limit_text text;
        v_member_limit integer;
        v_active_member_count bigint;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        SELECT u.email
        INTO v_user_email
        FROM public.users u
        WHERE u.id = v_user_id
          AND u.deleted_at IS NULL;

        IF v_user_email IS NULL THEN
          RAISE EXCEPTION 'Current user not found';
        END IF;

        SELECT
          i.id,
          i.organization_id,
          i.role_id,
          i.email,
          i.expires_at,
          i.accepted_at,
          i.revoked_at
        INTO
          v_invitation_id,
          v_organization_id,
          v_role_id,
          v_invitation_email,
          v_expires_at,
          v_accepted_at,
          v_revoked_at
        FROM public.invitations i
        WHERE i.token = p_token
          AND i.deleted_at IS NULL
        FOR UPDATE;

        IF v_invitation_id IS NULL THEN
          RAISE EXCEPTION 'Invitation not found';
        END IF;

        IF v_accepted_at IS NOT NULL THEN
          RAISE EXCEPTION 'Invitation has already been accepted';
        END IF;

        IF v_revoked_at IS NOT NULL THEN
          RAISE EXCEPTION 'Invitation has been revoked';
        END IF;

        IF v_expires_at <= CURRENT_TIMESTAMP THEN
          RAISE EXCEPTION 'Invitation has expired';
        END IF;

        IF v_invitation_email <> v_user_email::public.citext THEN
          RAISE EXCEPTION
            'Invitation email does not match current user';
        END IF;

        -- F-01: Reject deleted organizations.
        -- Serialize invitation acceptance per organization.
        -- NO KEY UPDATE remains compatible with FK KEY SHARE locks.
        PERFORM 1
        FROM public.organizations o
        WHERE o.id = v_organization_id
          AND o.deleted_at IS NULL
        FOR NO KEY UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION
            'Organization not found or inactive';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = v_role_id
            AND r.organization_id = v_organization_id
            AND r.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION 'Invitation role is invalid';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.user_id = v_user_id
            AND m.organization_id = v_organization_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'User is already a member of this organization';
        END IF;

        -- Match the subscription eligibility rules used by
        -- ProjectsService.getProjectLimit().
        SELECT COUNT(*)::integer
        INTO v_subscription_count
        FROM public.subscriptions s
        WHERE s.organization_id = v_organization_id;

        IF v_subscription_count > 1 THEN
          RAISE EXCEPTION
            'Invalid subscription configuration';
        END IF;

        -- Preserve existing behavior when no subscription exists.
        IF v_subscription_count = 1 THEN
          SELECT
            s.status,
            s.current_period_start,
            s.current_period_end,
            p.is_active,
            f.is_active,
            f.value_type,
            pf.value
          INTO
            v_subscription_status,
            v_period_start,
            v_period_end,
            v_plan_is_active,
            v_feature_is_active,
            v_feature_value_type,
            v_limit_text
          FROM public.subscriptions s
          JOIN public.plans p
            ON p.id = s.plan_id
          LEFT JOIN public.features f
            ON f.slug = 'max_members'
          LEFT JOIN public.plan_features pf
            ON pf.plan_id = p.id
           AND pf.feature_id = f.id
          WHERE s.organization_id = v_organization_id;

          IF NOT FOUND THEN
            RAISE EXCEPTION
              'Invalid subscription configuration';
          END IF;

          IF (
            v_subscription_status NOT IN ('active', 'trialing')
            OR v_period_start IS NULL
            OR v_period_end IS NULL
            OR v_period_start > CURRENT_TIMESTAMP
            OR v_period_end <= CURRENT_TIMESTAMP
            OR v_plan_is_active IS DISTINCT FROM true
          ) THEN
            RAISE EXCEPTION
              'An active subscription is required to accept invitations';
          END IF;

          -- Missing or inactive features retain unlimited behavior.
          IF (
            v_feature_is_active IS TRUE
            AND v_limit_text IS NOT NULL
          ) THEN
            IF v_feature_value_type IS DISTINCT FROM 'number' THEN
              RAISE EXCEPTION
                'Invalid max_members feature configuration';
            END IF;

            IF (
              v_limit_text !~ '^[0-9]+$'
              OR length(v_limit_text) > 10
            ) THEN
              RAISE EXCEPTION
                'Invalid max_members limit configuration';
            END IF;

            BEGIN
              v_member_limit := v_limit_text::integer;
            EXCEPTION
              WHEN numeric_value_out_of_range THEN
                RAISE EXCEPTION
                  'Invalid max_members limit configuration';
            END;

            SELECT COUNT(*)
            INTO v_active_member_count
            FROM public.memberships m
            WHERE m.organization_id = v_organization_id
              AND m.deleted_at IS NULL;

            IF v_active_member_count >= v_member_limit THEN
              RAISE EXCEPTION
                'Organization member limit reached';
            END IF;
          END IF;
        END IF;

        INSERT INTO public.memberships (
          user_id,
          organization_id,
          role_id
        )
        VALUES (
          v_user_id,
          v_organization_id,
          v_role_id
        )
        RETURNING id INTO v_membership_id;

        UPDATE public.invitations i
        SET accepted_at = CURRENT_TIMESTAMP
        WHERE i.id = v_invitation_id;

        RETURN QUERY
        SELECT
          v_membership_id,
          v_organization_id,
          v_invitation_id,
          v_invitation_email::text,
          v_role_id;
      END;
      $_$;


ALTER FUNCTION public.accept_invitation_with_details(p_token text) OWNER TO postgres;

--
-- Name: assign_role_permission(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_role_permission(p_role_id uuid, p_permission_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_organization_id uuid;
        v_role_slug text;
        v_permission_slug text;
        v_assignment_id uuid;
      BEGIN
        SELECT r.organization_id, r.slug
        INTO v_organization_id, v_role_slug
        FROM public.roles r
        JOIN public.organizations o
          ON o.id = r.organization_id
        WHERE r.id = p_role_id
          AND r.deleted_at IS NULL
          AND o.deleted_at IS NULL;

        IF v_organization_id IS NULL THEN
          RAISE EXCEPTION 'Role not found'
            USING ERRCODE = '22023';
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          'roles.manage'
        ) THEN
          RAISE EXCEPTION 'Permission denied: roles.manage'
            USING ERRCODE = '42501';
        END IF;

        IF v_role_slug = 'administrator' THEN
          RAISE EXCEPTION
            'Administrator role permissions are protected'
            USING ERRCODE = '42501';
        END IF;

        SELECT p.slug
        INTO v_permission_slug
        FROM public.permissions p
        WHERE p.id = p_permission_id
          AND p.deleted_at IS NULL;

        IF v_permission_slug IS NULL THEN
          RAISE EXCEPTION 'Permission not found'
            USING ERRCODE = '22023';
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          v_permission_slug
        ) THEN
          RAISE EXCEPTION
            'Cannot grant a permission you do not hold'
            USING ERRCODE = '42501';
        END IF;

        INSERT INTO public.role_permissions (
          role_id,
          permission_id
        )
        VALUES (
          p_role_id,
          p_permission_id
        )
        RETURNING id INTO v_assignment_id;

        RETURN v_assignment_id;
      END;
      $$;


ALTER FUNCTION public.assign_role_permission(p_role_id uuid, p_permission_id uuid) OWNER TO postgres;

--
-- Name: bootstrap_organization(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.bootstrap_organization(p_name text, p_slug text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_user_id uuid;
        v_organization_id uuid;
        v_role_id uuid;
        v_permission_count integer;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = v_user_id
            AND u.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Current user not found or inactive';
        END IF;

        SELECT COUNT(*)
        INTO v_permission_count
        FROM public.permissions
        WHERE slug IN (
          'audit_logs.read',
          'api_keys.manage',
          'members.manage',
          'members.read',
          'organizations.update',
          'projects.create',
          'projects.delete',
          'projects.read',
          'projects.update',
          'roles.manage',
          'roles.read',
          'tasks.create',
          'tasks.delete',
          'tasks.read',
          'tasks.update',
          'teams.create',
          'teams.delete',
          'teams.read',
          'teams.update',
          'webhooks.manage',
          'workflows.create',
          'workflows.delete',
          'workflows.read',
          'workflows.update'
        )
          AND deleted_at IS NULL;

        IF v_permission_count <> 24 THEN
          RAISE EXCEPTION
            'Required administrator permissions are missing';
        END IF;

        INSERT INTO public.organizations (
          name,
          slug
        )
        VALUES (
          p_name,
          p_slug
        )
        RETURNING id INTO v_organization_id;

        INSERT INTO public.roles (
          organization_id,
          name,
          slug,
          description
        )
        VALUES (
          v_organization_id,
          'Administrator',
          'administrator',
          'Default administrator role'
        )
        RETURNING id INTO v_role_id;

        INSERT INTO public.memberships (
          user_id,
          organization_id,
          role_id
        )
        VALUES (
          v_user_id,
          v_organization_id,
          v_role_id
        );

        INSERT INTO public.role_permissions (
          role_id,
          permission_id
        )
        SELECT
          v_role_id,
          p.id
        FROM public.permissions p
        WHERE p.slug IN (
          'audit_logs.read',
          'api_keys.manage',
          'members.manage',
          'members.read',
          'organizations.update',
          'projects.create',
          'projects.delete',
          'projects.read',
          'projects.update',
          'roles.manage',
          'roles.read',
          'tasks.create',
          'tasks.delete',
          'tasks.read',
          'tasks.update',
          'teams.create',
          'teams.delete',
          'teams.read',
          'teams.update',
          'webhooks.manage',
          'workflows.create',
          'workflows.delete',
          'workflows.read',
          'workflows.update'
        )
          AND p.deleted_at IS NULL;

        RETURN v_organization_id;
      END;
      $$;


ALTER FUNCTION public.bootstrap_organization(p_name text, p_slug text) OWNER TO postgres;

--
-- Name: create_activity(uuid, text, text, uuid, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_activity(p_organization_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb DEFAULT NULL::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_user_id uuid;
        v_activity_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting(
            'app.user_id',
            true
          ),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION
            'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id =
            p_organization_id
            AND m.user_id =
              v_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active member of this organization';
        END IF;

        IF p_action IS NULL
           OR btrim(p_action) = '' THEN
          RAISE EXCEPTION
            'Activity action is required';
        END IF;

        IF p_entity_type IS NULL
           OR btrim(p_entity_type) = '' THEN
          RAISE EXCEPTION
            'Activity entity type is required';
        END IF;

        INSERT INTO public.activities (
          organization_id,
          user_id,
          action,
          entity_type,
          entity_id,
          metadata
        )
        VALUES (
          p_organization_id,
          v_user_id,
          btrim(p_action),
          btrim(p_entity_type),
          p_entity_id,
          p_metadata
        )
        RETURNING id
        INTO v_activity_id;

        RETURN v_activity_id;
      END;
      $$;


ALTER FUNCTION public.create_activity(p_organization_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb) OWNER TO postgres;

--
-- Name: create_audit_log(uuid, uuid, text, text, uuid, jsonb, inet, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_audit_log(p_organization_id uuid, p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_current_user_id uuid;
        v_audit_log_id uuid;
      BEGIN
        v_current_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_current_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF p_user_id IS DISTINCT FROM v_current_user_id THEN
          RAISE EXCEPTION
            'Audit log user does not match current user';
        END IF;

        IF NOT public.is_current_user_active_member(
          p_organization_id
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active organization member';
        END IF;

        IF NULLIF(btrim(p_action), '') IS NULL
           OR length(p_action) > 100 THEN
          RAISE EXCEPTION 'Invalid audit action';
        END IF;

        IF NULLIF(btrim(p_entity_type), '') IS NULL
           OR length(p_entity_type) > 100 THEN
          RAISE EXCEPTION 'Invalid audit entity type';
        END IF;

        IF p_entity_id IS NULL THEN
          RAISE EXCEPTION 'Audit entity ID is required';
        END IF;

        INSERT INTO public.audit_logs (
          organization_id,
          user_id,
          action,
          entity_type,
          entity_id,
          metadata,
          ip_address,
          user_agent
        )
        VALUES (
          p_organization_id,
          p_user_id,
          p_action,
          p_entity_type,
          p_entity_id,
          p_metadata,
          p_ip_address,
          p_user_agent
        )
        RETURNING id INTO v_audit_log_id;

        RETURN v_audit_log_id;
      END;
      $$;


ALTER FUNCTION public.create_audit_log(p_organization_id uuid, p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text) OWNER TO postgres;

--
-- Name: create_notification(uuid, uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  v_current_user_id uuid;
  v_notification_id uuid;
BEGIN
  v_current_user_id := NULLIF(
    current_setting('app.user_id', true),
    ''
  )::uuid;

  IF v_current_user_id IS NULL THEN
    RAISE EXCEPTION 'app.user_id is not set';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = v_current_user_id
      AND m.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Current user is not an active member of this organization';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = p_user_id
      AND m.deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION
      'Notification recipient is not an active member of this organization';
  END IF;

  IF p_type IS NULL OR btrim(p_type) = '' THEN
    RAISE EXCEPTION 'Notification type is required';
  END IF;

  IF p_title IS NULL OR btrim(p_title) = '' THEN
    RAISE EXCEPTION 'Notification title is required';
  END IF;

  IF p_message IS NULL OR btrim(p_message) = '' THEN
    RAISE EXCEPTION 'Notification message is required';
  END IF;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata
  )
  VALUES (
    p_user_id,
    btrim(p_type),
    btrim(p_title),
    btrim(p_message),
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;


ALTER FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) OWNER TO postgres;

--
-- Name: create_notification(uuid, uuid, text, text, text, jsonb, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb, p_target_path text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_current_user_id uuid;
        v_notification_id uuid;
      BEGIN
        v_current_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_current_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = v_current_user_id
            AND u.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION 'Current user not found or inactive';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = v_current_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active member of this organization';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = p_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Notification recipient is not an active member of this organization';
        END IF;

        IF p_type IS NULL OR pg_catalog.btrim(p_type) = '' THEN
          RAISE EXCEPTION 'Notification type is required';
        END IF;

        IF p_title IS NULL OR pg_catalog.btrim(p_title) = '' THEN
          RAISE EXCEPTION 'Notification title is required';
        END IF;

        IF p_message IS NULL OR pg_catalog.btrim(p_message) = '' THEN
          RAISE EXCEPTION 'Notification message is required';
        END IF;

        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          target_path
        )
        VALUES (
          p_user_id,
          pg_catalog.btrim(p_type),
          pg_catalog.btrim(p_title),
          pg_catalog.btrim(p_message),
          p_metadata,
          p_target_path
        )
        RETURNING id INTO v_notification_id;

        RETURN v_notification_id;
      END;
      $$;


ALTER FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb, p_target_path text) OWNER TO postgres;

--
-- Name: create_organization_role(uuid, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.create_organization_role(p_organization_id uuid, p_name text, p_slug text, p_description text DEFAULT NULL::text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
      DECLARE
        v_role_id uuid;
      BEGIN
        IF NOT public.current_user_has_organization_permission(
          p_organization_id,
          'roles.manage'
        ) THEN
          RAISE EXCEPTION 'Permission denied: roles.manage'
            USING ERRCODE = '42501';
        END IF;

        IF p_name IS NULL
          OR length(btrim(p_name)) = 0
          OR length(p_name) > 100
        THEN
          RAISE EXCEPTION 'Invalid role name'
            USING ERRCODE = '22023';
        END IF;

        IF p_slug IS NULL
          OR length(p_slug) > 100
          OR p_slug !~ '^[a-z][a-z0-9_-]*$'
        THEN
          RAISE EXCEPTION 'Invalid role slug'
            USING ERRCODE = '22023';
        END IF;

        IF p_slug = 'administrator' THEN
          RAISE EXCEPTION 'Reserved role slug'
            USING ERRCODE = '42501';
        END IF;

        INSERT INTO public.roles (
          organization_id,
          name,
          slug,
          description
        )
        VALUES (
          p_organization_id,
          btrim(p_name),
          p_slug,
          p_description
        )
        RETURNING id INTO v_role_id;

        RETURN v_role_id;
      END;
      $_$;


ALTER FUNCTION public.create_organization_role(p_organization_id uuid, p_name text, p_slug text, p_description text) OWNER TO postgres;

--
-- Name: current_app_user_id(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_app_user_id() RETURNS uuid
    LANGUAGE sql STABLE
    SET search_path TO 'pg_catalog'
    AS $$
    SELECT NULLIF(
        current_setting('app.user_id', true),
        ''
    )::uuid;
$$;


ALTER FUNCTION public.current_app_user_id() OWNER TO postgres;

--
-- Name: current_user_has_organization_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.current_user_has_organization_permission(p_organization_id uuid, p_permission_slug text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
        SELECT EXISTS (
          SELECT 1
          FROM public.memberships m
          JOIN public.users u
            ON u.id = m.user_id
          JOIN public.organizations o
            ON o.id = m.organization_id
          JOIN public.roles r
            ON r.id = m.role_id
           AND r.organization_id = m.organization_id
          JOIN public.role_permissions rp
            ON rp.role_id = r.id
          JOIN public.permissions p
            ON p.id = rp.permission_id
          WHERE m.organization_id = p_organization_id
            AND m.user_id = NULLIF(
              current_setting('app.user_id', true),
              ''
            )::uuid
            AND m.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND o.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND p.slug = p_permission_slug
        );
      $$;


ALTER FUNCTION public.current_user_has_organization_permission(p_organization_id uuid, p_permission_slug text) OWNER TO postgres;

--
-- Name: get_organization_member_directory(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_organization_member_directory(p_organization_id uuid) RETURNS TABLE(membership_id uuid, user_id uuid, first_name text, last_name text, email text, role_id uuid)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_current_user_id uuid;
      BEGIN
        v_current_user_id := NULLIF(
          current_setting(
            'app.user_id',
            true
          ),
          ''
        )::uuid;

        IF v_current_user_id IS NULL THEN
          RAISE EXCEPTION
            'app.user_id is not set';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          WHERE m.organization_id =
            p_organization_id
            AND m.user_id =
              v_current_user_id
            AND m.deleted_at IS NULL
        ) THEN
          RAISE EXCEPTION
            'Current user is not an active member of this organization';
        END IF;

        RETURN QUERY
        SELECT
          m.id AS membership_id,
          u.id AS user_id,
          u.first_name::text,
          u.last_name::text,
          u.email::text,
          m.role_id
        FROM public.memberships m
        INNER JOIN public.users u
          ON u.id = m.user_id
        WHERE m.organization_id =
          p_organization_id
          AND m.deleted_at IS NULL
          AND u.deleted_at IS NULL
        ORDER BY
          u.first_name,
          u.last_name,
          u.email;
      END;
      $$;


ALTER FUNCTION public.get_organization_member_directory(p_organization_id uuid) OWNER TO postgres;

--
-- Name: get_user_for_login(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_user_for_login(p_email text) RETURNS TABLE(id uuid, first_name text, last_name text, email text, password_hash text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
        SELECT
          u.id,
          u.first_name::text,
          u.last_name::text,
          u.email::text,
          u.password_hash::text
        FROM public.users u
        WHERE lower(u.email::text) = lower(btrim(p_email))
          AND u.deleted_at IS NULL
        LIMIT 1;
      $$;


ALTER FUNCTION public.get_user_for_login(p_email text) OWNER TO postgres;

--
-- Name: is_current_user_active_member(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_current_user_active_member(p_organization_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
        SELECT EXISTS (
          SELECT 1
          FROM public.memberships m
          JOIN public.users u
            ON u.id = m.user_id
          JOIN public.organizations o
            ON o.id = m.organization_id
          WHERE m.organization_id = p_organization_id
            AND m.user_id = NULLIF(
              current_setting('app.user_id', true),
              ''
            )::uuid
            AND m.deleted_at IS NULL
            AND u.deleted_at IS NULL
            AND o.deleted_at IS NULL
        );
      $$;


ALTER FUNCTION public.is_current_user_active_member(p_organization_id uuid) OWNER TO postgres;

--
-- Name: is_eligible_team_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_eligible_team_member(p_organization_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
        SELECT EXISTS (
          SELECT 1
          FROM public.organizations o
          JOIN public.memberships m
            ON m.organization_id = o.id
          JOIN public.users u
            ON u.id = m.user_id
          WHERE o.id = p_organization_id
            AND o.deleted_at IS NULL
            AND m.user_id = p_user_id
            AND m.deleted_at IS NULL
            AND u.deleted_at IS NULL
        );
      $$;


ALTER FUNCTION public.is_eligible_team_member(p_organization_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: is_user_active(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.is_user_active(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
        SELECT
          p_user_id IS NOT NULL
          AND p_user_id = NULLIF(
            current_setting('app.user_id', true),
            ''
          )::uuid
          AND EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = p_user_id
              AND u.deleted_at IS NULL
          );
      $$;


ALTER FUNCTION public.is_user_active(p_user_id uuid) OWNER TO postgres;

--
-- Name: register_user(text, text, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.register_user(p_first_name text, p_last_name text, p_email text, p_password_hash text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_user_id uuid;
      BEGIN
        IF p_first_name IS NULL
           OR btrim(p_first_name) = '' THEN
          RAISE EXCEPTION 'First name is required';
        END IF;

        IF p_last_name IS NULL
           OR btrim(p_last_name) = '' THEN
          RAISE EXCEPTION 'Last name is required';
        END IF;

        IF p_email IS NULL
           OR btrim(p_email) = '' THEN
          RAISE EXCEPTION 'Email is required';
        END IF;

        IF p_password_hash IS NULL
           OR btrim(p_password_hash) = '' THEN
          RAISE EXCEPTION 'Password hash is required';
        END IF;

        INSERT INTO public.users (
          first_name,
          last_name,
          email,
          password_hash
        )
        VALUES (
          btrim(p_first_name),
          btrim(p_last_name),
          lower(btrim(p_email)),
          p_password_hash
        )
        RETURNING id INTO v_user_id;

        RETURN v_user_id;
      END;
      $$;


ALTER FUNCTION public.register_user(p_first_name text, p_last_name text, p_email text, p_password_hash text) OWNER TO postgres;

--
-- Name: restore_team_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.restore_team_member(p_team_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_organization_id uuid;
      BEGIN
        SELECT t.organization_id
        INTO v_organization_id
        FROM public.teams t
        JOIN public.organizations o
          ON o.id = t.organization_id
        WHERE t.id = p_team_id
          AND t.deleted_at IS NULL
          AND o.deleted_at IS NULL;

        IF v_organization_id IS NULL THEN
          RETURN false;
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          'members.manage'
        ) THEN
          RETURN false;
        END IF;

        IF NOT public.is_eligible_team_member(
          v_organization_id,
          p_user_id
        ) THEN
          RETURN false;
        END IF;

        UPDATE public.team_members
        SET deleted_at = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE team_id = p_team_id
          AND user_id = p_user_id
          AND deleted_at IS NOT NULL;

        RETURN FOUND;
      END;
      $$;


ALTER FUNCTION public.restore_team_member(p_team_id uuid, p_user_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_automation(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_automation(p_automation_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
    v_organization_id uuid;
BEGIN
    SELECT a.organization_id
    INTO v_organization_id
    FROM public.automations AS a
    WHERE a.id = p_automation_id
      AND a.deleted_at IS NULL;

    IF v_organization_id IS NULL THEN
        RAISE EXCEPTION 'Automation not found';
    END IF;

    IF NOT public.is_current_user_active_member(
        v_organization_id
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    UPDATE public.automations
    SET
        deleted_at = now(),
        updated_at = now()
    WHERE id = p_automation_id
      AND deleted_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Automation not found';
    END IF;
END;
$$;


ALTER FUNCTION public.soft_delete_automation(p_automation_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_notification(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_notification(p_notification_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_user_id uuid;
      BEGIN
        v_user_id :=
          public.current_app_user_id();

        IF v_user_id IS NULL THEN
          RETURN false;
        END IF;

        UPDATE public.notifications
        SET deleted_at = CURRENT_TIMESTAMP
        WHERE id = p_notification_id
          AND user_id = v_user_id
          AND deleted_at IS NULL;

        RETURN FOUND;
      END;
      $$;


ALTER FUNCTION public.soft_delete_notification(p_notification_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_project(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_project(p_project_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
    v_organization_id uuid;
BEGIN
    SELECT p.organization_id
    INTO v_organization_id
    FROM public.projects p
    WHERE p.id = p_project_id
      AND p.deleted_at IS NULL;

    IF v_organization_id IS NULL THEN
        RETURN false;
    END IF;

    IF NOT public.is_current_user_active_member(
        v_organization_id
    ) THEN
        RETURN false;
    END IF;

    UPDATE public.projects
    SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_project_id
      AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.soft_delete_project(p_project_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_task(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_task(p_task_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
    v_organization_id uuid;
BEGIN
    SELECT p.organization_id
    INTO v_organization_id
    FROM public.tasks t
    JOIN public.projects p
      ON p.id = t.project_id
    WHERE t.id = p_task_id
      AND t.deleted_at IS NULL
      AND p.deleted_at IS NULL;

    IF v_organization_id IS NULL THEN
        RETURN false;
    END IF;

    IF NOT public.is_current_user_active_member(
        v_organization_id
    ) THEN
        RETURN false;
    END IF;

    UPDATE public.tasks
    SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_task_id
      AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.soft_delete_task(p_task_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_team(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_team(p_team_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_organization_id uuid;
      BEGIN
        SELECT t.organization_id
        INTO v_organization_id
        FROM public.teams t
        JOIN public.organizations o
          ON o.id = t.organization_id
        WHERE t.id = p_team_id
          AND t.deleted_at IS NULL
          AND o.deleted_at IS NULL;

        IF v_organization_id IS NULL THEN
          RETURN false;
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          'teams.delete'
        ) THEN
          RETURN false;
        END IF;

        UPDATE public.teams
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_team_id
          AND deleted_at IS NULL;

        RETURN FOUND;
      END;
      $$;


ALTER FUNCTION public.soft_delete_team(p_team_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_team_member(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_team_member(p_team_member_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_organization_id uuid;
      BEGIN
        SELECT t.organization_id
        INTO v_organization_id
        FROM public.team_members tm
        JOIN public.teams t
          ON t.id = tm.team_id
        JOIN public.organizations o
          ON o.id = t.organization_id
        WHERE tm.id = p_team_member_id
          AND tm.deleted_at IS NULL
          AND t.deleted_at IS NULL
          AND o.deleted_at IS NULL;

        IF v_organization_id IS NULL THEN
          RETURN false;
        END IF;

        IF NOT public.current_user_has_organization_permission(
          v_organization_id,
          'members.manage'
        ) THEN
          RETURN false;
        END IF;

        UPDATE public.team_members
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = p_team_member_id
          AND deleted_at IS NULL;

        RETURN FOUND;
      END;
      $$;


ALTER FUNCTION public.soft_delete_team_member(p_team_member_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_workflow(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_workflow(p_workflow_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
    v_organization_id uuid;
BEGIN
    SELECT p.organization_id
    INTO v_organization_id
    FROM public.workflows w
    JOIN public.projects p
      ON p.id = w.project_id
    WHERE w.id = p_workflow_id
      AND w.deleted_at IS NULL
      AND p.deleted_at IS NULL;

    IF v_organization_id IS NULL THEN
        RETURN false;
    END IF;

    IF NOT public.is_current_user_active_member(
        v_organization_id
    ) THEN
        RETURN false;
    END IF;

    UPDATE public.workflows
    SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_workflow_id
      AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.soft_delete_workflow(p_workflow_id uuid) OWNER TO postgres;

--
-- Name: soft_delete_workflow_step(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.soft_delete_workflow_step(p_workflow_step_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
    v_organization_id uuid;
BEGIN
    SELECT p.organization_id
    INTO v_organization_id
    FROM public.workflow_steps ws
    JOIN public.workflows w
      ON w.id = ws.workflow_id
    JOIN public.projects p
      ON p.id = w.project_id
    WHERE ws.id = p_workflow_step_id
      AND ws.deleted_at IS NULL
      AND w.deleted_at IS NULL
      AND p.deleted_at IS NULL;

    IF v_organization_id IS NULL THEN
        RETURN false;
    END IF;

    IF NOT public.is_current_user_active_member(
        v_organization_id
    ) THEN
        RETURN false;
    END IF;

    UPDATE public.workflow_steps
    SET
        deleted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_workflow_step_id
      AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$;


ALTER FUNCTION public.soft_delete_workflow_step(p_workflow_step_id uuid) OWNER TO postgres;

--
-- Name: update_current_user_password(text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_current_user_password(p_password_hash text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_user_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting(
            'app.user_id',
            true
          ),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF p_password_hash IS NULL
           OR btrim(p_password_hash) = '' THEN
          RAISE EXCEPTION 'Password hash is required';
        END IF;

        UPDATE public.users
        SET
          password_hash = p_password_hash,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_user_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Active user not found';
        END IF;
      END;
      $$;


ALTER FUNCTION public.update_current_user_password(p_password_hash text) OWNER TO postgres;

--
-- Name: update_current_user_profile(text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_current_user_profile(p_first_name text, p_last_name text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
      DECLARE
        v_user_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'app.user_id is not set';
        END IF;

        IF p_first_name IS NULL
           OR btrim(p_first_name) = '' THEN
          RAISE EXCEPTION 'First name is required';
        END IF;

        IF p_last_name IS NULL
           OR btrim(p_last_name) = '' THEN
          RAISE EXCEPTION 'Last name is required';
        END IF;

        UPDATE public.users
        SET
          first_name = btrim(p_first_name),
          last_name = btrim(p_last_name),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = v_user_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Active user not found';
        END IF;
      END;
      $$;


ALTER FUNCTION public.update_current_user_profile(p_first_name text, p_last_name text) OWNER TO postgres;

--
-- Name: update_organization_settings(uuid, text, text); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_organization_settings(p_organization_id uuid, p_name text, p_slug text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $_$
      DECLARE
        v_user_id uuid;
      BEGIN
        v_user_id := NULLIF(
          current_setting('app.user_id', true),
          ''
        )::uuid;

        IF v_user_id IS NULL THEN
          RAISE EXCEPTION 'Authentication required';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM public.memberships m
          JOIN public.roles r
            ON r.id = m.role_id
           AND r.organization_id = m.organization_id
          JOIN public.role_permissions rp
            ON rp.role_id = r.id
          JOIN public.permissions p
            ON p.id = rp.permission_id
          WHERE m.user_id = v_user_id
            AND m.organization_id = p_organization_id
            AND m.deleted_at IS NULL
            AND r.deleted_at IS NULL
            AND p.deleted_at IS NULL
            AND p.slug = 'organizations.update'
        ) THEN
          RAISE EXCEPTION 'Permission denied';
        END IF;

        IF p_name IS NULL
           OR length(btrim(p_name)) = 0
           OR length(btrim(p_name)) > 150 THEN
          RAISE EXCEPTION 'Invalid organization name';
        END IF;

        IF p_slug IS NULL
           OR p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
           OR length(p_slug) > 100 THEN
          RAISE EXCEPTION 'Invalid organization slug';
        END IF;

        UPDATE public.organizations
        SET
          name = btrim(p_name),
          slug = p_slug,
          updated_at = now()
        WHERE id = p_organization_id
          AND deleted_at IS NULL;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Organization not found';
        END IF;
      END;
      $_$;


ALTER FUNCTION public.update_organization_settings(p_organization_id uuid, p_name text, p_slug text) OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid NOT NULL
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    key_prefix character varying(20) NOT NULL,
    key_hash text NOT NULL,
    last_used_at timestamp with time zone,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_api_keys_expiry_after_creation" CHECK ((expires_at > created_at)),
    CONSTRAINT "CHK_api_keys_last_used_after_creation" CHECK ((last_used_at >= created_at)),
    CONSTRAINT "CHK_api_keys_revoked_after_creation" CHECK ((revoked_at >= created_at))
);


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.approvals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    approver_user_id uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    comment text,
    decided_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    requested_by_user_id uuid NOT NULL,
    decision_comment text,
    CONSTRAINT "CHK_approvals_status" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.approvals OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    metadata jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    organization_id uuid NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: automation_runs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automation_runs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    automation_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    trigger_payload jsonb,
    result jsonb,
    error_message text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    CONSTRAINT automation_runs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'succeeded'::character varying, 'failed'::character varying])::text[])))
);

ALTER TABLE ONLY public.automation_runs FORCE ROW LEVEL SECURITY;


ALTER TABLE public.automation_runs OWNER TO postgres;

--
-- Name: automations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.automations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    description text,
    trigger_type character varying(100) NOT NULL,
    trigger_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    action_type character varying(100) NOT NULL,
    action_config jsonb DEFAULT '{}'::jsonb NOT NULL,
    is_enabled boolean DEFAULT true NOT NULL,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

ALTER TABLE ONLY public.automations FORCE ROW LEVEL SECURITY;


ALTER TABLE public.automations OWNER TO postgres;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.comments OWNER TO postgres;

--
-- Name: features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.features (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    value_type character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.features OWNER TO postgres;

--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    task_id uuid NOT NULL,
    uploaded_by_user_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    storage_key character varying(255) NOT NULL,
    mime_type character varying(100) NOT NULL,
    file_size bigint NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT "CHK_files_file_size_non_negative" CHECK ((file_size >= 0))
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: invitations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invitations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    email public.citext NOT NULL,
    role_id uuid NOT NULL,
    token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    CONSTRAINT "CHK_invitations_accepted_after_creation" CHECK ((accepted_at >= created_at)),
    CONSTRAINT "CHK_invitations_expiry_after_creation" CHECK ((expires_at > created_at))
);


ALTER TABLE public.invitations OWNER TO postgres;

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.memberships (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    organization_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    role_id uuid NOT NULL
);


ALTER TABLE public.memberships OWNER TO postgres;

--
-- Name: migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    "timestamp" bigint NOT NULL,
    name character varying NOT NULL
);


ALTER TABLE public.migrations OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO postgres;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    type character varying(100) NOT NULL,
    title character varying(255) NOT NULL,
    message text NOT NULL,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    target_path text,
    metadata jsonb
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(150) NOT NULL,
    slug public.citext NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.permissions OWNER TO postgres;

--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plan_features (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    plan_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    value text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.plan_features OWNER TO postgres;

--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    price numeric(12,2) NOT NULL,
    currency character varying(3) NOT NULL,
    billing_interval character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_plans_billing_interval" CHECK (((billing_interval)::text = ANY ((ARRAY['month'::character varying, 'year'::character varying])::text[]))),
    CONSTRAINT "CHK_plans_price_non_negative" CHECK ((price >= (0)::numeric))
);


ALTER TABLE public.plans OWNER TO postgres;

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.project_members OWNER TO postgres;

--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.role_permissions OWNER TO postgres;

--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sessions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    refresh_token_hash text NOT NULL,
    user_agent text,
    ip_address inet,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone,
    CONSTRAINT "CHK_sessions_expiry_after_creation" CHECK ((expires_at > created_at)),
    CONSTRAINT "CHK_sessions_revoked_after_creation" CHECK ((revoked_at >= created_at))
);


ALTER TABLE public.sessions OWNER TO postgres;

--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying(20) NOT NULL,
    current_period_start timestamp with time zone NOT NULL,
    current_period_end timestamp with time zone NOT NULL,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    canceled_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_subscriptions_canceled_after_creation" CHECK ((canceled_at >= created_at)),
    CONSTRAINT "CHK_subscriptions_period" CHECK ((current_period_end > current_period_start)),
    CONSTRAINT "CHK_subscriptions_status" CHECK (((status)::text = ANY ((ARRAY['active'::character varying, 'trialing'::character varying, 'past_due'::character varying, 'canceled'::character varying])::text[])))
);


ALTER TABLE public.subscriptions OWNER TO postgres;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    workflow_step_id uuid,
    assigned_to_user_id uuid,
    title character varying(200) NOT NULL,
    description text,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    priority character varying(50) DEFAULT 'medium'::character varying NOT NULL,
    due_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT "CHK_tasks_priority" CHECK (((priority)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying])::text[]))),
    CONSTRAINT "CHK_tasks_status" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'canceled'::character varying])::text[])))
);


ALTER TABLE public.tasks OWNER TO postgres;

--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: usage_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_records (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    feature_id uuid NOT NULL,
    usage numeric(18,2) NOT NULL,
    period_start timestamp with time zone NOT NULL,
    period_end timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_usage_records_period" CHECK ((period_end > period_start)),
    CONSTRAINT "CHK_usage_records_usage_non_negative" CHECK ((usage >= (0)::numeric))
);


ALTER TABLE public.usage_records OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    email character varying NOT NULL,
    password_hash character varying NOT NULL,
    email_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: webhook_deliveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhook_deliveries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    webhook_id uuid NOT NULL,
    event character varying(100) NOT NULL,
    payload text NOT NULL,
    status character varying(20) NOT NULL,
    attempt integer DEFAULT 1 NOT NULL,
    response_status integer,
    response_body text,
    delivered_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "CHK_webhook_deliveries_attempt_positive" CHECK ((attempt >= 1)),
    CONSTRAINT "CHK_webhook_deliveries_response_status" CHECK (((response_status >= 100) AND (response_status <= 599))),
    CONSTRAINT "CHK_webhook_deliveries_status" CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying])::text[])))
);


ALTER TABLE public.webhook_deliveries OWNER TO postgres;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhooks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    url text NOT NULL,
    secret text NOT NULL,
    events text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.webhooks OWNER TO postgres;

--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_steps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workflow_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    description text,
    step_type character varying(50) NOT NULL,
    "position" integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT "CHK_workflow_steps_position_non_negative" CHECK (("position" >= 0))
);


ALTER TABLE public.workflow_steps OWNER TO postgres;

--
-- Name: workflow_transitions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflow_transitions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    workflow_id uuid NOT NULL,
    from_step_id uuid NOT NULL,
    to_step_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    condition text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.workflow_transitions OWNER TO postgres;

--
-- Name: workflows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.workflows (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    slug character varying(150) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


ALTER TABLE public.workflows OWNER TO postgres;

--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: project_members PK_0b2f46f804be4aea9234c78bcc9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT "PK_0b2f46f804be4aea9234c78bcc9" PRIMARY KEY (id);


--
-- Name: audit_logs PK_1bb179d048bbc581caa3b013439; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY (id);


--
-- Name: memberships PK_25d28bd932097a9e90495ede7b4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT "PK_25d28bd932097a9e90495ede7b4" PRIMARY KEY (id);


--
-- Name: sessions PK_3238ef96f18b355b671619111bc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY (id);


--
-- Name: plans PK_3720521a81c7c24fe9b7202ba61; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT "PK_3720521a81c7c24fe9b7202ba61" PRIMARY KEY (id);


--
-- Name: webhook_deliveries PK_535dd409947fb6d8fc6dfc0112a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT "PK_535dd409947fb6d8fc6dfc0112a" PRIMARY KEY (id);


--
-- Name: workflows PK_5b5757cc1cd86268019fef52e0c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT "PK_5b5757cc1cd86268019fef52e0c" PRIMARY KEY (id);


--
-- Name: features PK_5c1e336df2f4a7051e5bf08a941; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.features
    ADD CONSTRAINT "PK_5c1e336df2f4a7051e5bf08a941" PRIMARY KEY (id);


--
-- Name: api_keys PK_5c8a79801b44bd27b79228e1dad; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "PK_5c8a79801b44bd27b79228e1dad" PRIMARY KEY (id);


--
-- Name: invitations PK_5dec98cfdfd562e4ad3648bbb07; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT "PK_5dec98cfdfd562e4ad3648bbb07" PRIMARY KEY (id);


--
-- Name: projects PK_6271df0a7aed1d6c0691ce6ac50; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "PK_6271df0a7aed1d6c0691ce6ac50" PRIMARY KEY (id);


--
-- Name: approvals PK_690417aaefa84d18b1a59e2a499; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "PK_690417aaefa84d18b1a59e2a499" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: organizations PK_6b031fcd0863e3f6b44230163f9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "PK_6b031fcd0863e3f6b44230163f9" PRIMARY KEY (id);


--
-- Name: files PK_6c16b9093a142e0e7613b04a3d9; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY (id);


--
-- Name: teams PK_7e5523774a38b08a6236d322403; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "PK_7e5523774a38b08a6236d322403" PRIMARY KEY (id);


--
-- Name: activities PK_7f4004429f731ffb9c88eb486a8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY (id);


--
-- Name: role_permissions PK_84059017c90bfcb701b8fa42297; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "PK_84059017c90bfcb701b8fa42297" PRIMARY KEY (id);


--
-- Name: comments PK_8bf68bc960f2b69e818bdb90dcb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "PK_8bf68bc960f2b69e818bdb90dcb" PRIMARY KEY (id);


--
-- Name: migrations PK_8c82d7f526340ab734260ea46be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT "PK_8c82d7f526340ab734260ea46be" PRIMARY KEY (id);


--
-- Name: tasks PK_8d12ff38fcc62aaba2cab748772; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "PK_8d12ff38fcc62aaba2cab748772" PRIMARY KEY (id);


--
-- Name: permissions PK_920331560282b8bd21bb02290df; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT "PK_920331560282b8bd21bb02290df" PRIMARY KEY (id);


--
-- Name: webhooks PK_9e8795cfc899ab7bdaa831e8527; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT "PK_9e8795cfc899ab7bdaa831e8527" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: subscriptions PK_a87248d73155605cf782be9ee5e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "PK_a87248d73155605cf782be9ee5e" PRIMARY KEY (id);


--
-- Name: workflow_steps PK_b602e5ecb22943db11c96a7f31c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT "PK_b602e5ecb22943db11c96a7f31c" PRIMARY KEY (id);


--
-- Name: roles PK_c1433d71a4838793a49dcad46ab; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY (id);


--
-- Name: team_members PK_ca3eae89dcf20c9fd95bf7460aa; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "PK_ca3eae89dcf20c9fd95bf7460aa" PRIMARY KEY (id);


--
-- Name: usage_records PK_e511cf9f7dc53851569f87467a5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "PK_e511cf9f7dc53851569f87467a5" PRIMARY KEY (id);


--
-- Name: plan_features PK_eb2b32d1d93a8b2e96e122e3a77; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT "PK_eb2b32d1d93a8b2e96e122e3a77" PRIMARY KEY (id);


--
-- Name: workflow_transitions PK_edda0b5bb7b13fc6681c56764af; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT "PK_edda0b5bb7b13fc6681c56764af" PRIMARY KEY (id);


--
-- Name: organizations UQ_963693341bd612aa01ddf3a4b68; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT "UQ_963693341bd612aa01ddf3a4b68" UNIQUE (slug);


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: automation_runs automation_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_pkey PRIMARY KEY (id);


--
-- Name: automations automations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_pkey PRIMARY KEY (id);


--
-- Name: IDX_0122008cb9b6ae1ba6f3713cf2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_0122008cb9b6ae1ba6f3713cf2" ON public.teams USING btree (organization_id, slug);


--
-- Name: IDX_03b01312e81d9165f8a2636b58; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_03b01312e81d9165f8a2636b58" ON public.plan_features USING btree (plan_id, feature_id);


--
-- Name: IDX_085d540d9f418cfbdc7bd55bb1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_085d540d9f418cfbdc7bd55bb1" ON public.sessions USING btree (user_id);


--
-- Name: IDX_145f35b204c731ba7fc1a0be0e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_145f35b204c731ba7fc1a0be0e" ON public.audit_logs USING btree (organization_id);


--
-- Name: IDX_18c2493067c11f44efb35ca0e0; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_18c2493067c11f44efb35ca0e0" ON public.comments USING btree (task_id);


--
-- Name: IDX_1c6b42e179c67ce855c5b94ba3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1c6b42e179c67ce855c5b94ba3" ON public.files USING btree (task_id);


--
-- Name: IDX_1d3c06a8217a8785e2af0ec4ab; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_1d3c06a8217a8785e2af0ec4ab" ON public.team_members USING btree (team_id, user_id);


--
-- Name: IDX_25d24010f53bb80b78e412c965; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_25d24010f53bb80b78e412c965" ON public.role_permissions USING btree (role_id, permission_id);


--
-- Name: IDX_27821ee30aa99daef697f21322; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_27821ee30aa99daef697f21322" ON public.tasks USING btree (assigned_to_user_id);


--
-- Name: IDX_293f3e8c52737da668e8e67c2f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_293f3e8c52737da668e8e67c2f" ON public.webhooks USING btree (organization_id, name);


--
-- Name: IDX_2ce18271dd0a77092307dd540b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_2ce18271dd0a77092307dd540b" ON public.usage_records USING btree (organization_id, feature_id, period_start, period_end);


--
-- Name: IDX_3afc80b5ecc0276428da3e3a87; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_3afc80b5ecc0276428da3e3a87" ON public.invitations USING btree (organization_id, email);


--
-- Name: IDX_4c675567d2a58f0b07cef09c13; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_4c675567d2a58f0b07cef09c13" ON public.comments USING btree (user_id);


--
-- Name: IDX_5323ccd23482802bd9759e88ee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5323ccd23482802bd9759e88ee" ON public.notifications USING btree (user_id, read_at);


--
-- Name: IDX_57384430aa1959f4578046c9b8; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_57384430aa1959f4578046c9b8" ON public.api_keys USING btree (key_hash);


--
-- Name: IDX_62033671bb7c0b96b512de2525; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_62033671bb7c0b96b512de2525" ON public.approvals USING btree (task_id, status);


--
-- Name: IDX_7421efc125d95e413657efa3c6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7421efc125d95e413657efa3c6" ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: IDX_7a791b7cd889c3b710b20b0bfd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7a791b7cd889c3b710b20b0bfd" ON public.tasks USING btree (workflow_step_id);


--
-- Name: IDX_84e797fe324298fa51e6ed04ca; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_84e797fe324298fa51e6ed04ca" ON public.approvals USING btree (approver_user_id);


--
-- Name: IDX_8657ba08a46e505f8cbbcf9b8a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8657ba08a46e505f8cbbcf9b8a" ON public.comments USING btree (task_id, created_at);


--
-- Name: IDX_8d82387ba026be63046895fe37; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8d82387ba026be63046895fe37" ON public.tasks USING btree (project_id, status);


--
-- Name: IDX_93f14fa9535b6ec752b32a48ba; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_93f14fa9535b6ec752b32a48ba" ON public.features USING btree (slug);


--
-- Name: IDX_98a034f3603f95ab549c425914; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_98a034f3603f95ab549c425914" ON public.activities USING btree (organization_id);


--
-- Name: IDX_9a8a82462cab47c73d25f49261; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_9a8a82462cab47c73d25f49261" ON public.notifications USING btree (user_id);


--
-- Name: IDX_9e19e6e534ee8bc908e801e5d3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_9e19e6e534ee8bc908e801e5d3" ON public.projects USING btree (organization_id, slug);


--
-- Name: IDX_9ea1509175fa294fc64d43a9fe; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_9ea1509175fa294fc64d43a9fe" ON public.subscriptions USING btree (organization_id);


--
-- Name: IDX_a58525528c251b82c7372c8229; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_a58525528c251b82c7372c8229" ON public.approvals USING btree (task_id);


--
-- Name: IDX_aa2165d6782fd6eafb18d01c95; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_aa2165d6782fd6eafb18d01c95" ON public.workflow_transitions USING btree (from_step_id);


--
-- Name: IDX_b08017cf6de16a450e976e8442; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b08017cf6de16a450e976e8442" ON public.workflow_steps USING btree (workflow_id, "position");


--
-- Name: IDX_b3f491d3a3f986106d281d8eb4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_b3f491d3a3f986106d281d8eb4" ON public.project_members USING btree (project_id, user_id);


--
-- Name: IDX_b82f1d8368dd5305ae7e7e664c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b82f1d8368dd5305ae7e7e664c" ON public.activities USING btree (user_id);


--
-- Name: IDX_bd2726fd31b35443f2245b93ba; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_bd2726fd31b35443f2245b93ba" ON public.audit_logs USING btree (user_id);


--
-- Name: IDX_cee5459245f652b75eb2759b4c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_cee5459245f652b75eb2759b4c" ON public.audit_logs USING btree (action);


--
-- Name: IDX_d090ad82a0e97ce764c06c7b31; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_d090ad82a0e97ce764c06c7b31" ON public.permissions USING btree (slug);


--
-- Name: IDX_d37a5113e41a5034f655984495; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d37a5113e41a5034f655984495" ON public.workflow_transitions USING btree (to_step_id);


--
-- Name: IDX_d9d8c8222d2d0b4f649f96a088; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_d9d8c8222d2d0b4f649f96a088" ON public.workflows USING btree (project_id, slug);


--
-- Name: IDX_e0ad587524bd3fe05f8e77ef3f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_e0ad587524bd3fe05f8e77ef3f" ON public.activities USING btree (entity_type, entity_id);


--
-- Name: IDX_e2d74e11bc40beb60ac88007cd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_e2d74e11bc40beb60ac88007cd" ON public.memberships USING btree (user_id, organization_id) WHERE (deleted_at IS NULL);


--
-- Name: IDX_e577dcf9bb6d084373ed399850; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_e577dcf9bb6d084373ed399850" ON public.invitations USING btree (token);


--
-- Name: IDX_e7b71bb444e74ee067df057397; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_e7b71bb444e74ee067df057397" ON public.plans USING btree (slug);


--
-- Name: IDX_eae5327e9069c824467f9e746a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_eae5327e9069c824467f9e746a" ON public.files USING btree (uploaded_by_user_id);


--
-- Name: IDX_ef9094995ca863e15cfc5df7f2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_ef9094995ca863e15cfc5df7f2" ON public.workflow_steps USING btree (workflow_id, slug);


--
-- Name: IDX_f5fd71d04eed4f0e82ec48814f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_f5fd71d04eed4f0e82ec48814f" ON public.workflow_transitions USING btree (workflow_id, slug);


--
-- Name: IDX_f65cacc6b129bca202d6509f84; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_f65cacc6b129bca202d6509f84" ON public.roles USING btree (organization_id, slug);


--
-- Name: IDX_ff6a6af2b5ceb2b23d07ec286d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_ff6a6af2b5ceb2b23d07ec286d" ON public.webhook_deliveries USING btree (webhook_id, created_at);


--
-- Name: idx_approvals_requested_by_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_approvals_requested_by_user_id ON public.approvals USING btree (requested_by_user_id);


--
-- Name: idx_automation_runs_automation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_runs_automation ON public.automation_runs USING btree (automation_id);


--
-- Name: idx_automation_runs_organization; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_runs_organization ON public.automation_runs USING btree (organization_id);


--
-- Name: idx_automation_runs_started_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automation_runs_started_at ON public.automation_runs USING btree (started_at DESC);


--
-- Name: idx_automations_organization; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automations_organization ON public.automations USING btree (organization_id);


--
-- Name: idx_automations_organization_enabled; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_automations_organization_enabled ON public.automations USING btree (organization_id, is_enabled);


--
-- Name: idx_memberships_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_memberships_role_id ON public.memberships USING btree (role_id);


--
-- Name: workflow_steps FK_02f0092e12343bfed27bb65fa89; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT "FK_02f0092e12343bfed27bb65fa89" FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE RESTRICT;


--
-- Name: sessions FK_085d540d9f418cfbdc7bd55bb19; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "FK_085d540d9f418cfbdc7bd55bb19" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: webhooks FK_1263da9f2a66fe09006bd86130e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT "FK_1263da9f2a66fe09006bd86130e" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: audit_logs FK_145f35b204c731ba7fc1a0be0e7; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_145f35b204c731ba7fc1a0be0e7" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: role_permissions FK_17022daf3f885f7d35423e9971e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_17022daf3f885f7d35423e9971e" FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE RESTRICT;


--
-- Name: role_permissions FK_178199805b901ccd220ab7740ec; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "FK_178199805b901ccd220ab7740ec" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: comments FK_18c2493067c11f44efb35ca0e03; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "FK_18c2493067c11f44efb35ca0e03" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;


--
-- Name: files FK_1c6b42e179c67ce855c5b94ba31; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "FK_1c6b42e179c67ce855c5b94ba31" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;


--
-- Name: tasks FK_27821ee30aa99daef697f21322c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_27821ee30aa99daef697f21322c" FOREIGN KEY (assigned_to_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: plan_features FK_27e866bdf4c6f2cf5854b7d0e57; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT "FK_27e866bdf4c6f2cf5854b7d0e57" FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE RESTRICT;


--
-- Name: usage_records FK_2908478bc9172434a2452e57a1f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "FK_2908478bc9172434a2452e57a1f" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: workflows FK_376276dcfa299f6483d37c83ccb; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT "FK_376276dcfa299f6483d37c83ccb" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: invitations FK_42d1dbb4d85dc3643fdc6560af0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT "FK_42d1dbb4d85dc3643fdc6560af0" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: comments FK_4c675567d2a58f0b07cef09c13d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT "FK_4c675567d2a58f0b07cef09c13d" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: workflow_transitions FK_58336fc5e065337745f54ed09b1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT "FK_58336fc5e065337745f54ed09b1" FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE RESTRICT;


--
-- Name: projects FK_585c8ce06628c70b70100bfb842; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT "FK_585c8ce06628c70b70100bfb842" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: tasks FK_7a791b7cd889c3b710b20b0bfd2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_7a791b7cd889c3b710b20b0bfd2" FOREIGN KEY (workflow_step_id) REFERENCES public.workflow_steps(id) ON DELETE SET NULL;


--
-- Name: memberships FK_7c1e2fdfed4f6838e0c05ae5051; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT "FK_7c1e2fdfed4f6838e0c05ae5051" FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: approvals FK_84e797fe324298fa51e6ed04ca6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "FK_84e797fe324298fa51e6ed04ca6" FOREIGN KEY (approver_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: activities FK_98a034f3603f95ab549c4259147; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "FK_98a034f3603f95ab549c4259147" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: notifications FK_9a8a82462cab47c73d25f49261f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_9a8a82462cab47c73d25f49261f" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: subscriptions FK_9ea1509175fa294fc64d43a9fe6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "FK_9ea1509175fa294fc64d43a9fe6" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: tasks FK_9eecdb5b1ed8c7c2a1b392c28d4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT "FK_9eecdb5b1ed8c7c2a1b392c28d4" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: webhook_deliveries FK_a0286aeb96db651efd1ae2966f2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhook_deliveries
    ADD CONSTRAINT "FK_a0286aeb96db651efd1ae2966f2" FOREIGN KEY (webhook_id) REFERENCES public.webhooks(id) ON DELETE RESTRICT;


--
-- Name: api_keys FK_a283bdef18876e525aefaec042f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT "FK_a283bdef18876e525aefaec042f" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: approvals FK_a58525528c251b82c7372c8229d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT "FK_a58525528c251b82c7372c8229d" FOREIGN KEY (task_id) REFERENCES public.tasks(id) ON DELETE RESTRICT;


--
-- Name: workflow_transitions FK_aa2165d6782fd6eafb18d01c95f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT "FK_aa2165d6782fd6eafb18d01c95f" FOREIGN KEY (from_step_id) REFERENCES public.workflow_steps(id) ON DELETE RESTRICT;


--
-- Name: plan_features FK_b51952483b18fa15334d714a838; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT "FK_b51952483b18fa15334d714a838" FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT;


--
-- Name: project_members FK_b5729113570c20c7e214cf3f58d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT "FK_b5729113570c20c7e214cf3f58d" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE RESTRICT;


--
-- Name: activities FK_b82f1d8368dd5305ae7e7e664c2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "FK_b82f1d8368dd5305ae7e7e664c2" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: audit_logs FK_bd2726fd31b35443f2245b93ba0; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: team_members FK_c2bf4967c8c2a6b845dadfbf3d4; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "FK_c2bf4967c8c2a6b845dadfbf3d4" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: roles FK_c328a1ecd12a5f153a96df4509e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT "FK_c328a1ecd12a5f153a96df4509e" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: workflow_transitions FK_d37a5113e41a5034f6559844954; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.workflow_transitions
    ADD CONSTRAINT "FK_d37a5113e41a5034f6559844954" FOREIGN KEY (to_step_id) REFERENCES public.workflow_steps(id) ON DELETE RESTRICT;


--
-- Name: subscriptions FK_e45fca5d912c3a2fab512ac25dc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE RESTRICT;


--
-- Name: invitations FK_e4950c4d6aa2236f5213538e01a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT "FK_e4950c4d6aa2236f5213538e01a" FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: memberships FK_e5380c394ec7912046d07b54290; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT "FK_e5380c394ec7912046d07b54290" FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: project_members FK_e89aae80e010c2faa72e6a49ce8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT "FK_e89aae80e010c2faa72e6a49ce8" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: files FK_eae5327e9069c824467f9e746ae; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT "FK_eae5327e9069c824467f9e746ae" FOREIGN KEY (uploaded_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: usage_records FK_f12a2c6e4603d2a5fa521addec1; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_records
    ADD CONSTRAINT "FK_f12a2c6e4603d2a5fa521addec1" FOREIGN KEY (feature_id) REFERENCES public.features(id) ON DELETE RESTRICT;


--
-- Name: team_members FK_fdad7d5768277e60c40e01cdcea; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT "FK_fdad7d5768277e60c40e01cdcea" FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE RESTRICT;


--
-- Name: teams FK_fdc736f761896ccc179c823a785; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT "FK_fdc736f761896ccc179c823a785" FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: automation_runs automation_runs_automation_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_automation_fk FOREIGN KEY (automation_id) REFERENCES public.automations(id) ON DELETE RESTRICT;


--
-- Name: automation_runs automation_runs_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automation_runs
    ADD CONSTRAINT automation_runs_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: automations automations_created_by_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_created_by_fk FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: automations automations_organization_fk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.automations
    ADD CONSTRAINT automations_organization_fk FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;


--
-- Name: approvals fk_approvals_requested_by_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT fk_approvals_requested_by_user FOREIGN KEY (requested_by_user_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- Name: memberships fk_memberships_role; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT fk_memberships_role FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- Name: activities; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

--
-- Name: activities activities_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY activities_tenant_select ON public.activities FOR SELECT TO promiseflow_app USING (public.is_current_user_active_member(organization_id));


--
-- Name: api_keys; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

--
-- Name: api_keys api_keys_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY api_keys_tenant_insert ON public.api_keys FOR INSERT TO promiseflow_app WITH CHECK ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'api_keys.manage'::text)));


--
-- Name: api_keys api_keys_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY api_keys_tenant_select ON public.api_keys FOR SELECT TO promiseflow_app USING ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'api_keys.manage'::text)));


--
-- Name: api_keys api_keys_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY api_keys_tenant_update ON public.api_keys FOR UPDATE TO promiseflow_app USING ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'api_keys.manage'::text))) WITH CHECK ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'api_keys.manage'::text)));


--
-- Name: approvals; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;

--
-- Name: approvals approvals_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY approvals_tenant_insert ON public.approvals FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = approvals.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))));


--
-- Name: approvals approvals_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY approvals_tenant_select ON public.approvals FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = approvals.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: approvals approvals_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY approvals_tenant_update ON public.approvals FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = approvals.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = approvals.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))));


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs audit_logs_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_logs_tenant_insert ON public.audit_logs FOR INSERT WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: audit_logs audit_logs_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY audit_logs_tenant_select ON public.audit_logs FOR SELECT TO promiseflow_app USING (public.current_user_has_organization_permission(organization_id, 'audit_logs.read'::text));


--
-- Name: automation_runs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: automation_runs automation_runs_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automation_runs_tenant_insert ON public.automation_runs FOR INSERT TO promiseflow_app WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: automation_runs automation_runs_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automation_runs_tenant_select ON public.automation_runs FOR SELECT TO promiseflow_app USING (public.is_current_user_active_member(organization_id));


--
-- Name: automation_runs automation_runs_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automation_runs_tenant_update ON public.automation_runs FOR UPDATE TO promiseflow_app USING (public.is_current_user_active_member(organization_id)) WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: automations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

--
-- Name: automations automations_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automations_tenant_insert ON public.automations FOR INSERT TO promiseflow_app WITH CHECK ((public.is_current_user_active_member(organization_id) AND (created_by = public.current_app_user_id())));


--
-- Name: automations automations_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automations_tenant_select ON public.automations FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id)));


--
-- Name: automations automations_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY automations_tenant_update ON public.automations FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id))) WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- Name: comments comments_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY comments_tenant_insert ON public.comments FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = comments.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))));


--
-- Name: comments comments_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY comments_tenant_select ON public.comments FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = comments.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: comments comments_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY comments_tenant_update ON public.comments FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = comments.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = comments.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))));


--
-- Name: files; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

--
-- Name: files files_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY files_tenant_insert ON public.files FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = files.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))));


--
-- Name: files files_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY files_tenant_select ON public.files FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = files.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: files files_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY files_tenant_update ON public.files FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = files.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.tasks t
     JOIN public.projects p ON ((p.id = t.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((t.id = files.task_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (t.deleted_at IS NULL)))));


--
-- Name: invitations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

--
-- Name: invitations invitations_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY invitations_tenant_insert ON public.invitations FOR INSERT TO promiseflow_app WITH CHECK ((public.current_user_has_organization_permission(organization_id, 'members.manage'::text) AND (EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = invitations.role_id) AND (r.organization_id = invitations.organization_id) AND (r.deleted_at IS NULL))))));


--
-- Name: invitations invitations_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY invitations_tenant_select ON public.invitations FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND public.current_user_has_organization_permission(organization_id, 'members.manage'::text)));


--
-- Name: invitations invitations_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY invitations_tenant_update ON public.invitations FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND public.current_user_has_organization_permission(organization_id, 'members.manage'::text))) WITH CHECK ((public.current_user_has_organization_permission(organization_id, 'members.manage'::text) AND (EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = invitations.role_id) AND (r.organization_id = invitations.organization_id) AND (r.deleted_at IS NULL))))));


--
-- Name: memberships; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

--
-- Name: memberships memberships_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY memberships_tenant_insert ON public.memberships FOR INSERT TO promiseflow_app WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: memberships memberships_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY memberships_tenant_select ON public.memberships FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id)));


--
-- Name: memberships memberships_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY memberships_tenant_update ON public.memberships FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id))) WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications notifications_user_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_user_select ON public.notifications FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND (user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid)));


--
-- Name: notifications notifications_user_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY notifications_user_update ON public.notifications FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND (user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid))) WITH CHECK ((user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid));


--
-- Name: organizations; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

--
-- Name: organizations organizations_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY organizations_tenant_select ON public.organizations FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(id)));


--
-- Name: organizations organizations_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY organizations_tenant_update ON public.organizations FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(id))) WITH CHECK (public.is_current_user_active_member(id));


--
-- Name: project_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: project_members project_members_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY project_members_tenant_insert ON public.project_members FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = project_members.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))));


--
-- Name: project_members project_members_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY project_members_tenant_select ON public.project_members FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = project_members.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: project_members project_members_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY project_members_tenant_update ON public.project_members FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = project_members.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = project_members.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))));


--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projects projects_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY projects_tenant_insert ON public.projects FOR INSERT TO promiseflow_app WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: projects projects_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY projects_tenant_select ON public.projects FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id)));


--
-- Name: projects projects_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY projects_tenant_update ON public.projects FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id))) WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: role_permissions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: role_permissions role_permissions_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY role_permissions_tenant_insert ON public.role_permissions FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = role_permissions.role_id) AND (r.deleted_at IS NULL) AND public.is_current_user_active_member(r.organization_id)))));


--
-- Name: role_permissions role_permissions_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY role_permissions_tenant_select ON public.role_permissions FOR SELECT TO promiseflow_app USING ((EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = role_permissions.role_id) AND (r.deleted_at IS NULL) AND public.is_current_user_active_member(r.organization_id)))));


--
-- Name: role_permissions role_permissions_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY role_permissions_tenant_update ON public.role_permissions FOR UPDATE TO promiseflow_app USING ((EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = role_permissions.role_id) AND (r.deleted_at IS NULL) AND public.is_current_user_active_member(r.organization_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.roles r
  WHERE ((r.id = role_permissions.role_id) AND (r.deleted_at IS NULL) AND public.is_current_user_active_member(r.organization_id)))));


--
-- Name: roles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

--
-- Name: roles roles_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY roles_tenant_insert ON public.roles FOR INSERT TO promiseflow_app WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: roles roles_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY roles_tenant_select ON public.roles FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id)));


--
-- Name: roles roles_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY roles_tenant_update ON public.roles FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND public.is_current_user_active_member(organization_id))) WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions sessions_user_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sessions_user_insert ON public.sessions FOR INSERT TO promiseflow_app WITH CHECK ((user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid));


--
-- Name: sessions sessions_user_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sessions_user_select ON public.sessions FOR SELECT TO promiseflow_app USING ((user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid));


--
-- Name: sessions sessions_user_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY sessions_user_update ON public.sessions FOR UPDATE TO promiseflow_app USING ((user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid)) WITH CHECK ((user_id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid));


--
-- Name: subscriptions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: subscriptions subscriptions_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY subscriptions_tenant_insert ON public.subscriptions FOR INSERT TO promiseflow_app WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: subscriptions subscriptions_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY subscriptions_tenant_select ON public.subscriptions FOR SELECT TO promiseflow_app USING (public.is_current_user_active_member(organization_id));


--
-- Name: subscriptions subscriptions_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY subscriptions_tenant_update ON public.subscriptions FOR UPDATE TO promiseflow_app USING (public.is_current_user_active_member(organization_id)) WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: tasks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: tasks tasks_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tasks_tenant_insert ON public.tasks FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = tasks.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))));


--
-- Name: tasks tasks_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tasks_tenant_select ON public.tasks FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = tasks.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: tasks tasks_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY tasks_tenant_update ON public.tasks FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = tasks.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = tasks.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))));


--
-- Name: team_members; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: team_members team_members_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_tenant_insert ON public.team_members FOR INSERT TO promiseflow_app WITH CHECK (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.teams t
     JOIN public.organizations o ON ((o.id = t.organization_id)))
  WHERE ((t.id = team_members.team_id) AND (t.deleted_at IS NULL) AND (o.deleted_at IS NULL) AND public.current_user_has_organization_permission(t.organization_id, 'members.manage'::text) AND public.is_eligible_team_member(t.organization_id, team_members.user_id))))));


--
-- Name: team_members team_members_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY team_members_tenant_select ON public.team_members FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM (public.teams t
     JOIN public.memberships m ON ((m.organization_id = t.organization_id)))
  WHERE ((t.id = team_members.team_id) AND (t.deleted_at IS NULL) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL))))));


--
-- Name: teams; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

--
-- Name: teams teams_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_tenant_insert ON public.teams FOR INSERT TO promiseflow_app WITH CHECK (((deleted_at IS NULL) AND public.current_user_has_organization_permission(organization_id, 'teams.create'::text) AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = teams.organization_id) AND (o.deleted_at IS NULL))))));


--
-- Name: teams teams_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_tenant_select ON public.teams FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.memberships m
  WHERE ((m.organization_id = teams.organization_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL))))));


--
-- Name: teams teams_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY teams_tenant_update ON public.teams FOR UPDATE TO promiseflow_app USING (((deleted_at IS NULL) AND public.current_user_has_organization_permission(organization_id, 'teams.update'::text))) WITH CHECK (((deleted_at IS NULL) AND public.current_user_has_organization_permission(organization_id, 'teams.update'::text) AND (EXISTS ( SELECT 1
   FROM public.organizations o
  WHERE ((o.id = teams.organization_id) AND (o.deleted_at IS NULL))))));


--
-- Name: usage_records; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

--
-- Name: usage_records usage_records_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY usage_records_tenant_insert ON public.usage_records FOR INSERT TO promiseflow_app WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: usage_records usage_records_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY usage_records_tenant_select ON public.usage_records FOR SELECT TO promiseflow_app USING (public.is_current_user_active_member(organization_id));


--
-- Name: usage_records usage_records_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY usage_records_tenant_update ON public.usage_records FOR UPDATE TO promiseflow_app USING (public.is_current_user_active_member(organization_id)) WITH CHECK (public.is_current_user_active_member(organization_id));


--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
-- Name: users users_self_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY users_self_select ON public.users FOR SELECT TO promiseflow_app USING (((deleted_at IS NULL) AND (id = (NULLIF(current_setting('app.user_id'::text, true), ''::text))::uuid)));


--
-- Name: webhook_deliveries; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

--
-- Name: webhook_deliveries webhook_deliveries_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhook_deliveries_tenant_insert ON public.webhook_deliveries FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM public.webhooks w
  WHERE ((w.id = webhook_deliveries.webhook_id) AND public.is_current_user_active_member(w.organization_id)))));


--
-- Name: webhook_deliveries webhook_deliveries_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhook_deliveries_tenant_select ON public.webhook_deliveries FOR SELECT TO promiseflow_app USING ((EXISTS ( SELECT 1
   FROM public.webhooks w
  WHERE ((w.id = webhook_deliveries.webhook_id) AND public.is_current_user_active_member(w.organization_id) AND public.current_user_has_organization_permission(w.organization_id, 'webhooks.manage'::text)))));


--
-- Name: webhook_deliveries webhook_deliveries_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhook_deliveries_tenant_update ON public.webhook_deliveries FOR UPDATE TO promiseflow_app USING ((EXISTS ( SELECT 1
   FROM public.webhooks w
  WHERE ((w.id = webhook_deliveries.webhook_id) AND public.is_current_user_active_member(w.organization_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.webhooks w
  WHERE ((w.id = webhook_deliveries.webhook_id) AND public.is_current_user_active_member(w.organization_id)))));


--
-- Name: webhooks; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

--
-- Name: webhooks webhooks_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhooks_tenant_insert ON public.webhooks FOR INSERT TO promiseflow_app WITH CHECK ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'webhooks.manage'::text)));


--
-- Name: webhooks webhooks_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhooks_tenant_select ON public.webhooks FOR SELECT TO promiseflow_app USING ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'webhooks.manage'::text)));


--
-- Name: webhooks webhooks_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY webhooks_tenant_update ON public.webhooks FOR UPDATE TO promiseflow_app USING ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'webhooks.manage'::text))) WITH CHECK ((public.is_current_user_active_member(organization_id) AND public.current_user_has_organization_permission(organization_id, 'webhooks.manage'::text)));


--
-- Name: workflow_steps; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_steps workflow_steps_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflow_steps_tenant_insert ON public.workflow_steps FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((w.id = workflow_steps.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL)))));


--
-- Name: workflow_steps workflow_steps_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflow_steps_tenant_select ON public.workflow_steps FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((w.id = workflow_steps.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: workflow_steps workflow_steps_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflow_steps_tenant_update ON public.workflow_steps FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((w.id = workflow_steps.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((w.id = workflow_steps.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL)))));


--
-- Name: workflow_transitions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;

--
-- Name: workflow_transitions workflow_transitions_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflow_transitions_tenant_insert ON public.workflow_transitions FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM ((((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
     JOIN public.workflow_steps fs ON (((fs.id = workflow_transitions.from_step_id) AND (fs.workflow_id = workflow_transitions.workflow_id))))
     JOIN public.workflow_steps ts ON (((ts.id = workflow_transitions.to_step_id) AND (ts.workflow_id = workflow_transitions.workflow_id))))
  WHERE ((w.id = workflow_transitions.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL) AND (fs.deleted_at IS NULL) AND (ts.deleted_at IS NULL)))));


--
-- Name: workflow_transitions workflow_transitions_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflow_transitions_tenant_select ON public.workflow_transitions FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
     JOIN public.workflow_steps fs ON (((fs.id = workflow_transitions.from_step_id) AND (fs.workflow_id = workflow_transitions.workflow_id))))
     JOIN public.workflow_steps ts ON (((ts.id = workflow_transitions.to_step_id) AND (ts.workflow_id = workflow_transitions.workflow_id))))
  WHERE ((w.id = workflow_transitions.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL) AND (fs.deleted_at IS NULL) AND (ts.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: workflow_transitions workflow_transitions_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflow_transitions_tenant_update ON public.workflow_transitions FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM ((((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
     JOIN public.workflow_steps fs ON (((fs.id = workflow_transitions.from_step_id) AND (fs.workflow_id = workflow_transitions.workflow_id))))
     JOIN public.workflow_steps ts ON (((ts.id = workflow_transitions.to_step_id) AND (ts.workflow_id = workflow_transitions.workflow_id))))
  WHERE ((w.id = workflow_transitions.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL) AND (fs.deleted_at IS NULL) AND (ts.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ((((public.workflows w
     JOIN public.projects p ON ((p.id = w.project_id)))
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
     JOIN public.workflow_steps fs ON (((fs.id = workflow_transitions.from_step_id) AND (fs.workflow_id = workflow_transitions.workflow_id))))
     JOIN public.workflow_steps ts ON (((ts.id = workflow_transitions.to_step_id) AND (ts.workflow_id = workflow_transitions.workflow_id))))
  WHERE ((w.id = workflow_transitions.workflow_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL) AND (w.deleted_at IS NULL) AND (fs.deleted_at IS NULL) AND (ts.deleted_at IS NULL)))));


--
-- Name: workflows; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

--
-- Name: workflows workflows_tenant_insert; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflows_tenant_insert ON public.workflows FOR INSERT TO promiseflow_app WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = workflows.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))));


--
-- Name: workflows workflows_tenant_select; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflows_tenant_select ON public.workflows FOR SELECT TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = workflows.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))) AND (deleted_at IS NULL)));


--
-- Name: workflows workflows_tenant_update; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY workflows_tenant_update ON public.workflows FOR UPDATE TO promiseflow_app USING (((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = workflows.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))) AND (deleted_at IS NULL))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (public.projects p
     JOIN public.memberships m ON ((m.organization_id = p.organization_id)))
  WHERE ((p.id = workflows.project_id) AND (m.user_id = public.current_app_user_id()) AND (m.deleted_at IS NULL) AND (p.deleted_at IS NULL)))));


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA public TO promiseflow_app;


--
-- Name: FUNCTION accept_invitation(p_token text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.accept_invitation(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.accept_invitation(p_token text) TO promiseflow_app;


--
-- Name: FUNCTION accept_invitation_with_details(p_token text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.accept_invitation_with_details(p_token text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.accept_invitation_with_details(p_token text) TO promiseflow_app;


--
-- Name: FUNCTION assign_role_permission(p_role_id uuid, p_permission_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.assign_role_permission(p_role_id uuid, p_permission_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.assign_role_permission(p_role_id uuid, p_permission_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION bootstrap_organization(p_name text, p_slug text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.bootstrap_organization(p_name text, p_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.bootstrap_organization(p_name text, p_slug text) TO promiseflow_app;


--
-- Name: FUNCTION create_activity(p_organization_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_activity(p_organization_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_activity(p_organization_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb) TO promiseflow_app;


--
-- Name: FUNCTION create_audit_log(p_organization_id uuid, p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_audit_log(p_organization_id uuid, p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_audit_log(p_organization_id uuid, p_user_id uuid, p_action text, p_entity_type text, p_entity_id uuid, p_metadata jsonb, p_ip_address inet, p_user_agent text) TO promiseflow_app;


--
-- Name: FUNCTION create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb) TO promiseflow_app;


--
-- Name: FUNCTION create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb, p_target_path text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb, p_target_path text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_notification(p_organization_id uuid, p_user_id uuid, p_type text, p_title text, p_message text, p_metadata jsonb, p_target_path text) TO promiseflow_app;


--
-- Name: FUNCTION create_organization_role(p_organization_id uuid, p_name text, p_slug text, p_description text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.create_organization_role(p_organization_id uuid, p_name text, p_slug text, p_description text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.create_organization_role(p_organization_id uuid, p_name text, p_slug text, p_description text) TO promiseflow_app;


--
-- Name: FUNCTION current_app_user_id(); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.current_app_user_id() FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_app_user_id() TO promiseflow_app;


--
-- Name: FUNCTION current_user_has_organization_permission(p_organization_id uuid, p_permission_slug text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.current_user_has_organization_permission(p_organization_id uuid, p_permission_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.current_user_has_organization_permission(p_organization_id uuid, p_permission_slug text) TO promiseflow_app;


--
-- Name: FUNCTION get_organization_member_directory(p_organization_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_organization_member_directory(p_organization_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_organization_member_directory(p_organization_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION get_user_for_login(p_email text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.get_user_for_login(p_email text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_user_for_login(p_email text) TO promiseflow_app;


--
-- Name: FUNCTION is_current_user_active_member(p_organization_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.is_current_user_active_member(p_organization_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_current_user_active_member(p_organization_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION is_eligible_team_member(p_organization_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.is_eligible_team_member(p_organization_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_eligible_team_member(p_organization_id uuid, p_user_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION is_user_active(p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.is_user_active(p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_user_active(p_user_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION register_user(p_first_name text, p_last_name text, p_email text, p_password_hash text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.register_user(p_first_name text, p_last_name text, p_email text, p_password_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.register_user(p_first_name text, p_last_name text, p_email text, p_password_hash text) TO promiseflow_app;


--
-- Name: FUNCTION restore_team_member(p_team_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.restore_team_member(p_team_id uuid, p_user_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.restore_team_member(p_team_id uuid, p_user_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_automation(p_automation_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_automation(p_automation_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_automation(p_automation_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_notification(p_notification_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_notification(p_notification_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_notification(p_notification_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_project(p_project_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_project(p_project_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_project(p_project_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_task(p_task_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_task(p_task_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_task(p_task_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_team(p_team_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_team(p_team_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_team(p_team_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_team_member(p_team_member_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_team_member(p_team_member_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_team_member(p_team_member_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_workflow(p_workflow_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_workflow(p_workflow_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_workflow(p_workflow_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION soft_delete_workflow_step(p_workflow_step_id uuid); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.soft_delete_workflow_step(p_workflow_step_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_workflow_step(p_workflow_step_id uuid) TO promiseflow_app;


--
-- Name: FUNCTION update_current_user_password(p_password_hash text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.update_current_user_password(p_password_hash text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_current_user_password(p_password_hash text) TO promiseflow_app;


--
-- Name: FUNCTION update_current_user_profile(p_first_name text, p_last_name text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.update_current_user_profile(p_first_name text, p_last_name text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_current_user_profile(p_first_name text, p_last_name text) TO promiseflow_app;


--
-- Name: FUNCTION update_organization_settings(p_organization_id uuid, p_name text, p_slug text); Type: ACL; Schema: public; Owner: postgres
--

REVOKE ALL ON FUNCTION public.update_organization_settings(p_organization_id uuid, p_name text, p_slug text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.update_organization_settings(p_organization_id uuid, p_name text, p_slug text) TO promiseflow_app;


--
-- Name: TABLE activities; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.activities TO promiseflow_app;


--
-- Name: TABLE api_keys; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.api_keys TO promiseflow_app;


--
-- Name: COLUMN api_keys.revoked_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(revoked_at) ON TABLE public.api_keys TO promiseflow_app;


--
-- Name: COLUMN api_keys.updated_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(updated_at) ON TABLE public.api_keys TO promiseflow_app;


--
-- Name: TABLE approvals; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.approvals TO promiseflow_app;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.audit_logs TO promiseflow_app;


--
-- Name: TABLE automation_runs; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.automation_runs TO promiseflow_app;


--
-- Name: TABLE automations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.automations TO promiseflow_app;


--
-- Name: TABLE comments; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.comments TO promiseflow_app;


--
-- Name: TABLE features; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.features TO promiseflow_app;


--
-- Name: TABLE files; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.files TO promiseflow_app;


--
-- Name: TABLE invitations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.invitations TO promiseflow_app;


--
-- Name: TABLE memberships; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.memberships TO promiseflow_app;


--
-- Name: TABLE migrations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE public.migrations TO promiseflow_app;


--
-- Name: TABLE notifications; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.notifications TO promiseflow_app;


--
-- Name: COLUMN notifications.read_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(read_at) ON TABLE public.notifications TO promiseflow_app;


--
-- Name: TABLE organizations; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE ON TABLE public.organizations TO promiseflow_app;


--
-- Name: TABLE permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.permissions TO promiseflow_app;


--
-- Name: TABLE plan_features; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.plan_features TO promiseflow_app;


--
-- Name: TABLE plans; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.plans TO promiseflow_app;


--
-- Name: TABLE project_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.project_members TO promiseflow_app;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.projects TO promiseflow_app;


--
-- Name: TABLE role_permissions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.role_permissions TO promiseflow_app;


--
-- Name: TABLE roles; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.roles TO promiseflow_app;


--
-- Name: TABLE sessions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.sessions TO promiseflow_app;


--
-- Name: TABLE subscriptions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT ON TABLE public.subscriptions TO promiseflow_app;


--
-- Name: TABLE tasks; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.tasks TO promiseflow_app;


--
-- Name: TABLE team_members; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.team_members TO promiseflow_app;


--
-- Name: TABLE teams; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.teams TO promiseflow_app;


--
-- Name: COLUMN teams.name; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(name) ON TABLE public.teams TO promiseflow_app;


--
-- Name: COLUMN teams.slug; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(slug) ON TABLE public.teams TO promiseflow_app;


--
-- Name: COLUMN teams.description; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(description) ON TABLE public.teams TO promiseflow_app;


--
-- Name: COLUMN teams.updated_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(updated_at) ON TABLE public.teams TO promiseflow_app;


--
-- Name: TABLE usage_records; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.usage_records TO promiseflow_app;


--
-- Name: TABLE users; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.users TO promiseflow_app;


--
-- Name: TABLE webhook_deliveries; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.webhook_deliveries TO promiseflow_app;


--
-- Name: TABLE webhooks; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE public.webhooks TO promiseflow_app;


--
-- Name: COLUMN webhooks.name; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(name) ON TABLE public.webhooks TO promiseflow_app;


--
-- Name: COLUMN webhooks.url; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(url) ON TABLE public.webhooks TO promiseflow_app;


--
-- Name: COLUMN webhooks.events; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(events) ON TABLE public.webhooks TO promiseflow_app;


--
-- Name: COLUMN webhooks.is_active; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(is_active) ON TABLE public.webhooks TO promiseflow_app;


--
-- Name: COLUMN webhooks.updated_at; Type: ACL; Schema: public; Owner: postgres
--

GRANT UPDATE(updated_at) ON TABLE public.webhooks TO promiseflow_app;


--
-- Name: TABLE workflow_steps; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_steps TO promiseflow_app;


--
-- Name: TABLE workflow_transitions; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflow_transitions TO promiseflow_app;


--
-- Name: TABLE workflows; Type: ACL; Schema: public; Owner: postgres
--

GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE public.workflows TO promiseflow_app;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT,INSERT,UPDATE ON TABLES TO promiseflow_app;


--
-- PostgreSQL database dump complete
--

\unrestrict JFVQdrcmaQweXKiAgevBsLd5vep7HErxMbkcfoV6djNsi0zpakA8oW1YVrvk97f
