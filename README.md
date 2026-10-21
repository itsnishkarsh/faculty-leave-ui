# Faculty Leave Portal

A Next.js app for faculty leave requests, HOD approvals, and portal administration. Supabase provides authentication and shared database storage.

## Local setup

```bash
npm install
```

Create `.env.local` from `.env.example` and add your Supabase project URL and publishable key. Start the app with:

```bash
npm run dev
```

## Database setup

Create `profiles` and `leave_requests` tables and the new-user profile trigger in the Supabase SQL Editor. Enable RLS on both tables. After the initial schema exists, run migrations `202610210001_role_management_departments.sql`, `202610210002_allowed_departments.sql`, and `202610210003_leave_conversations.sql` from `supabase/migrations` in the Supabase SQL Editor, in that order. They add department-scoped HOD access, the admin-only role assignment function, the allowed department list, and request conversations/callbacks with participant-only RLS.

New Auth sign-ups receive the `faculty` role. Administrators assign departments and `hod` / `admin` roles from the Admin console after verifying the person's responsibilities. The database function and RLS policies enforce those permissions; the public sign-up form never accepts an elevated role.

HOD accounts must have a department. HODs can see and review requests only for faculty assigned to the same department. The final administrator cannot be demoted.

Optional demo account seeding is disabled by default. To turn it on, set `DEMO_SEEDING_ENABLED=true` and `DEMO_ACCOUNT_PASSWORD=12345678`, and the server-only `SUPABASE_SECRET_KEY` in the local/Vercel environment. The Admin console always shows the demo tools to admins; the server checks the seeding flag and credentials before it creates accounts. The action creates 33 faculty logins (`faculty1@tcet.test` through `faculty33@tcet.test`, three per department) and 11 department-specific HOD logins, with 99 labeled sample leave requests and conversations. The existing sole administrator is retained; the seeder refuses to run if more than one administrator exists and never creates another. `.test` is reserved for testing and does not receive email, while the accounts can sign in with the shared password. These are demo credentials only. Keep seeding disabled unless you intentionally want demo records in Supabase, and disable it again after setup. Never expose the Supabase secret key with a `NEXT_PUBLIC_` name.

## Deployment

The GitHub repository is `itsnishkarsh/faculty-leave-ui`. Import it into Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the project's environment variables. Set the matching Supabase Auth Site URL and redirect URLs for the deployed domain.

Never add a Supabase secret or service-role key to a `NEXT_PUBLIC_` variable or browser code. RLS policies are required because the publishable key is used by the browser.
