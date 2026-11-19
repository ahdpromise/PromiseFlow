
\set ON_ERROR_STOP on

-- PromiseFlow max_members integration test
-- TEST DATABASE ONLY: promiseflow_rls_test
-- All test data is rolled back.

BEGIN;

DO $$
BEGIN
  IF current_database() <> 'promiseflow_rls_test' THEN
    RAISE EXCEPTION 'Refusing to run outside test database';
  END IF;

  IF session_user <> 'postgres' THEN
    RAISE EXCEPTION 'This test requires postgres as session_user';
  END IF;
END;
$$;

CREATE TEMP TABLE pf_member_test (
  organization_id uuid NOT NULL,
  tenth_user_id uuid NOT NULL,
  eleventh_user_id uuid NOT NULL,
  tenth_token text NOT NULL,
  eleventh_token text NOT NULL
) ON COMMIT DROP;

DO $$
DECLARE
  v_org_id uuid;
  v_role_id uuid;
  v_user_id uuid;
  v_tenth_user_id uuid;
  v_eleventh_user_id uuid;
  v_prefix text :=
    'pf-max-members-' ||
    replace(public.uuid_generate_v4()::text, '-', '');
  v_email text;
  v_tenth_token text;
  v_eleventh_token text;
  v_pro_plan_id uuid;
BEGIN
  SELECT id INTO STRICT v_pro_plan_id
  FROM public.plans
  WHERE name = 'Pro'
    AND is_active = true;

  INSERT INTO public.organizations (name, slug)
  VALUES ('Max Members Integration Test', v_prefix)
  RETURNING id INTO v_org_id;

  INSERT INTO public.roles (organization_id, name, slug)
  VALUES (v_org_id, 'Administrator', 'administrator')
  RETURNING id INTO v_role_id;

  INSERT INTO public.subscriptions (
    organization_id,
    plan_id,
    status,
    current_period_start,
    current_period_end
  )
  VALUES (
    v_org_id,
    v_pro_plan_id,
    'active',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    CURRENT_TIMESTAMP + INTERVAL '30 days'
  );

  -- Founder + 8 members = 9 active memberships.
  FOR i IN 1..9 LOOP
    v_email := v_prefix || '-member-' || i || '@example.test';

    INSERT INTO public.users (
      first_name,
      last_name,
      email,
      password_hash
    )
    VALUES (
      'Test',
      'Member',
      v_email,
      'integration-test-only-not-a-real-password'
    )
    RETURNING id INTO v_user_id;

    INSERT INTO public.memberships (
      user_id,
      organization_id,
      role_id
    )
    VALUES (
      v_user_id,
      v_org_id,
      v_role_id
    );
  END LOOP;

  -- Tenth member.
  v_email := v_prefix || '-member-10@example.test';
  v_tenth_token := v_prefix || '-token-10';

  INSERT INTO public.users (
    first_name, last_name, email, password_hash
  )
  VALUES (
    'Test', 'Member', v_email,
    'integration-test-only-not-a-real-password'
  )
  RETURNING id INTO v_tenth_user_id;

  INSERT INTO public.invitations (
    organization_id, email, role_id, token, expires_at
  )
  VALUES (
    v_org_id, v_email, v_role_id, v_tenth_token,
    CURRENT_TIMESTAMP + INTERVAL '7 days'
  );

  -- Eleventh member.
  v_email := v_prefix || '-member-11@example.test';
  v_eleventh_token := v_prefix || '-token-11';

  INSERT INTO public.users (
    first_name, last_name, email, password_hash
  )
  VALUES (
    'Test', 'Member', v_email,
    'integration-test-only-not-a-real-password'
  )
  RETURNING id INTO v_eleventh_user_id;

  INSERT INTO public.invitations (
    organization_id, email, role_id, token, expires_at
  )
  VALUES (
    v_org_id, v_email, v_role_id, v_eleventh_token,
    CURRENT_TIMESTAMP + INTERVAL '7 days'
  );

  INSERT INTO pf_member_test (
    organization_id,
    tenth_user_id,
    eleventh_user_id,
    tenth_token,
    eleventh_token
  )
  VALUES (
    v_org_id,
    v_tenth_user_id,
    v_eleventh_user_id,
    v_tenth_token,
    v_eleventh_token
  );
END;
$$;

GRANT SELECT ON pf_member_test TO promiseflow_app;

-- TEST 1: Accept the tenth invitation.
SET LOCAL ROLE promiseflow_app;

DO $$
DECLARE
  v_user_id uuid;
  v_token text;
  v_result_count integer;
BEGIN
  SELECT tenth_user_id, tenth_token
  INTO STRICT v_user_id, v_token
  FROM pf_member_test;

  PERFORM set_config('app.user_id', v_user_id::text, true);

  SELECT COUNT(*) INTO v_result_count
  FROM public.accept_invitation_with_details(v_token);

  IF v_result_count <> 1 THEN
    RAISE EXCEPTION 'FAIL: Tenth invitation not accepted';
  END IF;

  RAISE NOTICE 'PASS: Tenth invitation accepted';
END;
$$;

RESET ROLE;

DO $$
DECLARE
  v_org_id uuid;
  v_count bigint;
BEGIN
  SELECT organization_id INTO STRICT v_org_id
  FROM pf_member_test;

  SELECT COUNT(*) INTO v_count
  FROM public.memberships
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL;

  IF v_count <> 10 THEN
    RAISE EXCEPTION
      'FAIL: Expected 10 active members, got %', v_count;
  END IF;

  RAISE NOTICE 'PASS: Active member count = 10';
END;
$$;

-- TEST 2: Reject the eleventh invitation.
SET LOCAL ROLE promiseflow_app;

DO $$
DECLARE
  v_user_id uuid;
  v_token text;
  v_rejected boolean := false;
  v_error_message text;
BEGIN
  SELECT eleventh_user_id, eleventh_token
  INTO STRICT v_user_id, v_token
  FROM pf_member_test;

  PERFORM set_config('app.user_id', v_user_id::text, true);

  BEGIN
    PERFORM *
    FROM public.accept_invitation_with_details(v_token);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS
      v_error_message = MESSAGE_TEXT;

    IF v_error_message = 'Organization member limit reached' THEN
      v_rejected := true;
    ELSE
      RAISE EXCEPTION
        'FAIL: Unexpected rejection: %', v_error_message;
    END IF;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION
      'FAIL: Eleventh invitation was accepted';
  END IF;

  RAISE NOTICE 'PASS: Eleventh invitation rejected at limit';
END;
$$;

RESET ROLE;

DO $$
DECLARE
  v_org_id uuid;
  v_token text;
  v_count bigint;
  v_accepted_at timestamptz;
BEGIN
  SELECT organization_id, eleventh_token
  INTO STRICT v_org_id, v_token
  FROM pf_member_test;

  SELECT COUNT(*) INTO v_count
  FROM public.memberships
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL;

  IF v_count <> 10 THEN
    RAISE EXCEPTION
      'FAIL: Expected 10 members after rejection, got %', v_count;
  END IF;

  SELECT accepted_at INTO STRICT v_accepted_at
  FROM public.invitations
  WHERE token = v_token;

  IF v_accepted_at IS NOT NULL THEN
    RAISE EXCEPTION
      'FAIL: Rejected invitation marked accepted';
  END IF;

  RAISE NOTICE 'PASS: Rejected invitation remains unaccepted';
  RAISE NOTICE 'PASS: Member count remains 10';
END;
$$;

-- TEST 3: Soft-delete one existing membership.
DO $$
DECLARE
  v_org_id uuid;
  v_deleted_count integer;
  v_active_count bigint;
BEGIN
  SELECT organization_id INTO STRICT v_org_id
  FROM pf_member_test;

  WITH selected_member AS (
    SELECT id
    FROM public.memberships
    WHERE organization_id = v_org_id
      AND deleted_at IS NULL
    ORDER BY created_at, id
    LIMIT 1
  )
  UPDATE public.memberships m
  SET deleted_at = CURRENT_TIMESTAMP
  FROM selected_member s
  WHERE m.id = s.id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  IF v_deleted_count <> 1 THEN
    RAISE EXCEPTION
      'FAIL: Expected to soft-delete one membership';
  END IF;

  SELECT COUNT(*) INTO v_active_count
  FROM public.memberships
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL;

  IF v_active_count <> 9 THEN
    RAISE EXCEPTION
      'FAIL: Expected 9 active members, got %',
      v_active_count;
  END IF;

  RAISE NOTICE 'PASS: One membership soft-deleted';
  RAISE NOTICE 'PASS: Active member count = 9';
END;
$$;

-- TEST 4: Retry the eleventh invitation.
SET LOCAL ROLE promiseflow_app;

DO $$
DECLARE
  v_user_id uuid;
  v_token text;
  v_result_count integer;
BEGIN
  SELECT eleventh_user_id, eleventh_token
  INTO STRICT v_user_id, v_token
  FROM pf_member_test;

  PERFORM set_config('app.user_id', v_user_id::text, true);

  SELECT COUNT(*) INTO v_result_count
  FROM public.accept_invitation_with_details(v_token);

  IF v_result_count <> 1 THEN
    RAISE EXCEPTION
      'FAIL: Invitation not accepted after soft delete';
  END IF;

  RAISE NOTICE
    'PASS: Invitation accepted after soft delete';
END;
$$;

RESET ROLE;

-- TEST 5: Verify active count, soft delete and acceptance.
DO $$
DECLARE
  v_org_id uuid;
  v_token text;
  v_active_count bigint;
  v_deleted_count bigint;
  v_accepted_at timestamptz;
BEGIN
  SELECT organization_id, eleventh_token
  INTO STRICT v_org_id, v_token
  FROM pf_member_test;

  SELECT COUNT(*) INTO v_active_count
  FROM public.memberships
  WHERE organization_id = v_org_id
    AND deleted_at IS NULL;

  SELECT COUNT(*) INTO v_deleted_count
  FROM public.memberships
  WHERE organization_id = v_org_id
    AND deleted_at IS NOT NULL;

  SELECT accepted_at INTO STRICT v_accepted_at
  FROM public.invitations
  WHERE token = v_token;

  IF v_active_count <> 10 THEN
    RAISE EXCEPTION
      'FAIL: Expected 10 active members, got %',
      v_active_count;
  END IF;

  IF v_deleted_count <> 1 THEN
    RAISE EXCEPTION
      'FAIL: Expected one soft-deleted membership';
  END IF;

  IF v_accepted_at IS NULL THEN
    RAISE EXCEPTION
      'FAIL: Invitation was not marked accepted';
  END IF;

  RAISE NOTICE 'PASS: Active member count returned to 10';
  RAISE NOTICE 'PASS: Soft-deleted membership excluded';
  RAISE NOTICE 'PASS: New invitation marked accepted';
END;
$$;

ROLLBACK;

-- Confirm cleanup.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.memberships)
     OR EXISTS (SELECT 1 FROM public.invitations) THEN
    RAISE EXCEPTION
      'FAIL: Unexpected test data remains after rollback';
  END IF;

  RAISE NOTICE 'PASS: All test data rolled back';
END;
$$;

SELECT 'MAX_MEMBERS_SOFT_DELETE_TEST_PASSED' AS result;
