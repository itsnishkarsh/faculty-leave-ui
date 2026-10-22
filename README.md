<div align="center">
  <img src="public/eduleave-logo.jpeg" alt="EduLeave logo" width="220" />

  # EduLeave

  ### Faculty leave management, without the paperwork

  A role-based faculty leave portal for submitting requests, reviewing them by department, and keeping decisions and conversations together.

  **Live demo:** [eduleave.vercel.app](https://eduleave.vercel.app) · **Source:** [GitHub repository](https://github.com/itsnishkarsh/faculty-leave-ui)
</div>

---

## Contents

- [Project overview](#project-overview)
- [Roles and access](#roles-and-access)
- [Features](#features)
- [Current scope and limitations](#current-scope-and-limitations)
- [Technology](#technology)
- [Run locally](#run-locally)
- [Configure Supabase](#configure-supabase)
- [Apply database migrations](#apply-database-migrations)
- [Set up the first administrator](#set-up-the-first-administrator)
- [Create showcase accounts](#create-showcase-accounts)
- [Deploy to Vercel](#deploy-to-vercel)
- [Project structure](#project-structure)
- [Security notes](#security-notes)
- [Roadmap](#roadmap)

## Project overview

EduLeave is a college project that moves faculty leave requests and departmental review into one shared portal. Faculty members submit and track requests. Heads of Department (HODs) review requests for their own department. Administrators manage accounts and see portal activity across departments.

The app uses Supabase for authentication, PostgreSQL data, row-level security (RLS), realtime updates, and private file storage. Next.js serves the web application and server-side demo account setup endpoint; there is no separate custom backend service.

## Roles and access

| Role | Main access |
| --- | --- |
| Faculty | Submit leave requests, view their request history, message permitted portal members, make one-to-one browser voice calls, send voice messages, and upload a profile photo. |
| HOD | Review requests and leave history for faculty in the HOD’s assigned department; contact members of that department; post department announcements. |
| Admin | View portal accounts and leave history across departments, assign departments and roles, contact portal members, and post portal-wide or department announcements. |

New sign-ups receive the `faculty` role. An administrator assigns the person’s department and, when appropriate, HOD or admin access. The sign-up form does not let people choose an elevated role. Database functions and RLS policies enforce the role and department boundaries.

## Features

### Leave requests

- Apply for Casual Leave, Medical Leave, On Duty, or Earned Leave.
- Enter a date range, reason, and optional substitute.
- Review the current status: pending, approved, or rejected.
- Open a request conversation to discuss that specific application.
- Request a callback and see its handling status.
- Export request summaries as CSV from supported dashboards.

### Department review and administration

- Faculty, HOD, and admin dashboards are selected from the signed-in account’s role.
- HOD request visibility and review are restricted to the HOD’s assigned department.
- Admins can search/filter portal accounts, assign approved department names, and change roles.
- HODs and admins can inspect faculty leave history within their permitted scope.
- The last administrator cannot demote themself or be demoted through the app’s role-management function.

### Communication

- Private one-to-one text messages between permitted portal members.
- Browser-to-browser one-to-one voice calls, including incoming/outgoing call tones, call controls, and speaking activity indicators.
- Voice messages, including recording a message after a call is not answered.
- Presence indicators show whether a member currently has an active portal session.
- In-app message and announcement alerts, with an optional notification sound.
- Admins can announce to everyone or one department. HODs can announce only to their department.

Contact permissions are enforced in the database as well as the interface:

- Admins can contact any portal member.
- HODs can contact members assigned to their own department.
- Faculty can contact members of their department and admins.

### Profile photos

Signed-in users can upload or change their own profile photo from the profile-photo control in the dashboard header. Accepted formats are JPEG, PNG, and WebP, up to 5 MB. Photos are stored in a private Supabase Storage bucket; the app uses signed URLs to display them. Admins can see portal users’ photos, and HODs can see photos for members in their department.

There is no bulk-generated photo assignment tool in the admin console. Each person can upload their own photo.

## Current scope and limitations

- This is a project/demo portal. Confirm institution policy and obtain approval before using it for official leave administration.
- The approval queue supports a manager decision (HOD or admin). It is not a configurable multi-stage approval chain.
- The app displays counts and approved leave days from submitted requests, but institution-specific leave entitlements and remaining balances are not configured.
- There is no full leave calendar view yet.
- Voice calls are browser calls, not telephone-network/PSTN calls. Both people must be signed in with the site open, and the browser must allow microphone use.
- Calls use WebRTC with a public STUN service. Some restrictive networks require a TURN relay for reliable audio; none is provisioned by this repository.
- Voice announcements to a whole group are not implemented. Voice calling is one-to-one.
- Presence means the member has an active session/channel in the open app; it is not an attendance or availability guarantee.
- Email confirmation delivery depends on the Supabase Auth email configuration. The app does not currently include an in-app password recovery flow.
- Showcase/demo accounts and their sample leave records are fictional. They should not be confused with real staff records.

## Technology

| Area | Implementation |
| --- | --- |
| Web framework | Next.js 16 App Router |
| UI | React 19, TypeScript, Tailwind CSS 4 |
| Form validation | React Hook Form and Zod |
| Icons | Lucide React |
| Authentication | Supabase Auth |
| Database | Supabase PostgreSQL |
| Authorization | PostgreSQL RLS policies and role-checking functions |
| Realtime | Supabase Realtime for request, conversation, messaging, call-signaling, and announcement updates; Supabase Presence for online indicators |
| File storage | Private Supabase Storage buckets for profile photos and voice messages |
| Voice calls | WebRTC peer connection with Supabase database signaling |
| Hosting | Vercel |

This project uses **Next.js**, not Vite. Supabase is the managed backend service for auth and shared data; the browser connects with the publishable key and RLS remains enabled.

## Run locally

### Requirements

- Node.js compatible with the installed Next.js version (Node.js 20.9 or newer is recommended by Next.js 16).
- npm.
- A Supabase project with the database setup and migrations below applied.

### Install and start

From the repository root:

```bash
npm install
cp .env.example .env.local
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Edit `.env.local` with your own Supabase project URL and publishable key. Do not commit `.env.local`.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The login page links to faculty sign-up. A newly registered account is assigned the faculty role and needs a department assigned by an admin.

### Available commands

```bash
npm run dev      # Start the local Next.js development server
npm run lint     # Run ESLint
npm run build    # Create a production build (Next.js with webpack)
npm run start    # Serve a previously built production app
```

## Configure Supabase

### 1. Create a Supabase project

Create a project in Supabase and note its **Project URL** and **Publishable key**. These are the two required values for the browser app.

### 2. Add the required browser environment variables

Set these in `.env.local` for development, and in Vercel for deployments:

| Variable | Required | Meaning |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL, such as `https://your-project-ref.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase publishable key. This is intended for browser use and relies on RLS for access control. |

The `NEXT_PUBLIC_` prefix makes these values available to browser code. **Never use that prefix for a Supabase secret/service-role key.**

### 3. Configure Supabase Auth URLs

In Supabase, open **Authentication → URL Configuration**:

- Set **Site URL** to the current application origin. For production, this is `https://eduleave.vercel.app`.
- Add local and deployed app URLs to **Redirect URLs** as needed, for example `http://localhost:3000/**` and `https://eduleave.vercel.app/**`.
- If email confirmation is enabled, configure a working email provider and verify the confirmation flow against the production URL.

The app signs users in with email and password. Its public sign-up flow creates faculty accounts; role elevation is handled separately by the administrator.

## Configure the database

The repository contains incremental migrations, but the original base tables and new-user trigger are not included as a numbered migration. For a **brand-new Supabase project**, first run the following bootstrap SQL in **Supabase → SQL Editor → New query**. If your project already has the required `profiles` and `leave_requests` tables and trigger, do not recreate them; proceed to [Apply database migrations](#apply-database-migrations).

```sql
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null default 'faculty' check (role in ('faculty', 'hod', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid not null references public.profiles(id) on delete cascade,
  leave_type text not null check (leave_type in ('cl', 'ml', 'od', 'el')),
  start_date date not null,
  end_date date not null,
  substitute text,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  constraint leave_requests_valid_date_range check (end_date >= start_date)
);

alter table public.profiles enable row level security;
alter table public.leave_requests enable row level security;

create or replace function private.has_role(expected_roles text[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = any(expected_roles)
  );
$$;
revoke all on function private.has_role(text[]) from public, anon;
grant execute on function private.has_role(text[]) to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Faculty member'),
    'faculty'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'leave_requests'
  ) then
    alter publication supabase_realtime add table public.leave_requests;
  end if;
end;
$$;
```

This bootstrap creates only the base tables and trigger. The following migrations add the role/department policies and the rest of the application schema. Run them in order.

## Apply database migrations

For each file below, open it from `supabase/migrations`, copy its complete SQL into a new Supabase SQL Editor query, and run it. Keep the order shown:

| Order | Migration | What it adds |
| --- | --- | --- |
| 1 | `202610210001_role_management_departments.sql` | Department-aware access, admin role assignment function, core RLS policies and protected review rules. |
| 2 | `202610210002_allowed_departments.sql` | Database constraint listing the approved department names. |
| 3 | `202610210003_leave_conversations.sql` | Per-request messages and callback requests, with scoped RLS and Realtime. |
| 4 | `202610220001_direct_messaging_voice_calls.sql` | Direct messages, call records, WebRTC signaling, and portal directory function. |
| 5 | `202610220002_scoped_group_communications.sql` | Role/dept contact restrictions and department/all-member announcements. |
| 6 | `202610220003_voice_messages.sql` | Private voice-message records and the `voice-messages` storage bucket with policies. |
| 7 | `202610220004_profile_photos.sql` | `avatar_path`, the private `profile-photos` bucket, and photo access policies. |

After each run, check the SQL Editor result for success. If a migration fails, stop and resolve that error before running later migrations. Some migrations use idempotent `if not exists`/policy replacement logic, but they should still be applied in sequence because later functions and policies depend on earlier ones.

The migrations configure RLS, database permissions, Realtime publication membership, and the two private storage buckets used by the application. Do not disable RLS to work around a query error. Find and fix the policy or migration issue instead.

### Approved department names

The UI and database currently use these department names. The database constraint protects against invalid department values:

1. Computer Engineering
2. Information Technology
3. Electronics & Tele-Communication
4. Electronics and Computer Science
5. Mechanical Engineering
6. Civil Engineering
7. Computer Science and Engineering (Cyber Security)
8. Mechanical and Mechatronics Engineering (Additive Manufacturing)
9. Artificial Intelligence & Machine Learning
10. Artificial Intelligence & Data Science
11. Computer Science and Engineering (IoT)

## Set up the first administrator

1. Create an account through the app’s faculty sign-up page using the email that should become the administrator.
2. Apply the bootstrap and all seven migrations above.
3. In Supabase SQL Editor, promote that account. Replace the example email with the exact account email:

   ```sql
   update public.profiles
   set role = 'admin', department = null
   where lower(email) = lower('your-admin@college.edu');
   ```

4. Confirm that exactly one row was updated, then sign out and sign back in so the app reloads the profile role.
5. From the Admin console, assign each faculty and HOD account its approved department. HODs must have a department.

An admin role should only be granted to a trusted project administrator. The client hides pages based on role, and RLS/database functions enforce the same access rules at the data layer.

## Create showcase accounts

The Admin console includes an optional **Create accounts** tool to populate a demonstration project. It is separate from ordinary sign-up and is disabled unless its server-side settings are enabled.

The current seeder creates or refreshes:

- 33 fictional faculty accounts (`faculty1@tcet.test` through `faculty33@tcet.test`), three per department.
- 11 fictional HOD accounts, one per department.
- Up to 99 labeled sample leave requests, plus example request conversations.
- No additional administrator; the signed-in admin must be the project’s only admin.

The `.test` domain is reserved for testing and cannot receive email. The seeder currently requires the shared password `12345678`. These accounts and their leave records are for controlled demonstrations only, not real staff data.

To enable the account seeder, set these **server-only** variables in the local environment or in Vercel:

| Variable | Value / purpose |
| --- | --- |
| `DEMO_SEEDING_ENABLED` | `true` to enable the endpoint. Keep `false` unless intentionally creating demo data. |
| `DEMO_ACCOUNT_PASSWORD` | Must be `12345678` for the current endpoint implementation. |
| `SUPABASE_SECRET_KEY` | Supabase project secret key, used only by the server-side account seeder. A legacy `SUPABASE_SERVICE_ROLE_KEY` is also accepted by the code. |

The Supabase secret key must be stored as a Vercel **Secret** environment variable and must never have a `NEXT_PUBLIC_` prefix. Enable the variables only in the environment where you intend to seed accounts. After the demo accounts have been created, set `DEMO_SEEDING_ENABLED=false` and redeploy. Disabling the endpoint does not delete the demo accounts or their records.

There is no bulk profile-photo seeder. Users can upload their own profile photos individually.

## Deploy to Vercel

1. Push the repository to GitHub and import `itsnishkarsh/faculty-leave-ui` into Vercel.
2. Keep the project root set to the directory containing this `package.json` (the repository root).
3. Vercel should detect Next.js. The production build command is `npm run build`.
4. In **Project Settings → Environment Variables**, add these required variables for **Production** and any Preview environments you use:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Add demo-seeding variables only if you plan to run the optional account setup tool. Keep `SUPABASE_SECRET_KEY` server-only and select the correct Vercel environment scope. An existing Preview-only secret does not apply to Production.
6. Save the variables and redeploy the desired environment. A deployment does not automatically inherit environment-variable changes until it is rebuilt.
7. In Supabase Auth URL Configuration, set the production Site URL and allow the Vercel URL under Redirect URLs.
8. Visit the deployment, sign in as the administrator, and verify that dashboards load and role-specific access behaves as expected.

For a custom domain, add it in Vercel and update Supabase’s Site URL and Redirect URLs to include the new origin. Keep the Vercel preview domain in Redirect URLs if you still test preview deployments.

## Project structure

```text
app/
  page.tsx                    Faculty dashboard and leave request form
  login/                      Email/password sign-in
  signup/                     Faculty account creation
  hod/                        Department dashboard and faculty history
  admin/                      Account management and portal overview
  approvals/                  HOD/admin request review queue
  messages/                   Direct messages, announcements, voice messages
  leave/[id]/                 Request-specific conversation and callback view
  api/admin/demo-seed/        Optional server-side demo account seeder
components/
  auth-provider.tsx           Shared signed-in session state
  global-communications.tsx   Presence, call signaling and call interface
  profile-photo-uploader.tsx  Individual profile photo upload control
  leave-conversation.tsx      Application-specific messages/callback UI
lib/
  supabase/                   Browser Supabase client
  auth-store.ts               Sign-in, sign-up, profile and role operations
  leave-store.ts              Leave requests and status updates
  direct-messaging.ts         Portal directory and private messages
  conversation-store.ts       Request messages and callback requests
  voice-message-store.ts      Private voice-message storage operations
  profile-photo-store.ts      Individual profile-photo storage operations
  announcement-store.ts       Department and portal-wide announcements
  departments.ts              Approved department names used by the UI
supabase/migrations/          Incremental database migrations
public/                       Logo and static assets
```

## Security notes

- Never commit `.env.local`, production credentials, or any Supabase secret key.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser settings. A publishable key is not an authorization bypass; RLS policies are essential.
- `SUPABASE_SECRET_KEY` (or the legacy service-role key) bypasses RLS and belongs only in a trusted server environment. Do not expose it in a client component, browser bundle, screenshot, or `NEXT_PUBLIC_` variable.
- Keep RLS enabled on all application tables. The migrations grant only the required operations and apply role/department checks.
- Use fictional showcase records only for demos. Do not store real leave reasons, phone numbers, or staff data in a public showcase project without the institution’s approval and appropriate safeguards.
- Use HTTPS for microphone access and voice calls. The browser will request microphone permission.
- The profile-photo and voice-message buckets are private. Keep their policies and signed-URL behavior intact.

## Roadmap

- Add a calendar view for approved and pending leave, with appropriate department visibility.
- Configure leave entitlements and balances from institution-approved rules.
- Validate the flow with faculty and HODs in a small pilot.
- Improve call reliability across restrictive networks by configuring a TURN relay if required.
- Review account provisioning, email delivery, backups, monitoring, and data-retention needs before an official institutional rollout.

## Project status

EduLeave is a deployed academic project and demonstration. Features listed under [Current scope and limitations](#current-scope-and-limitations) should be considered before using it for real institutional operations.
