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

Create `profiles` and `leave_requests` tables, the new-user profile trigger, and their Row Level Security policies in the Supabase SQL Editor. The app expects the schema described in the project setup instructions. Enable RLS on both tables.

New Auth sign-ups receive the `faculty` role. Assign `hod` and `admin` roles to trusted accounts in Supabase; never allow a public sign-up form to choose an elevated role.

## Deployment

The GitHub repository is `itsnishkarsh/faculty-leave-ui`. Import it into Vercel and add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the project's environment variables. Set the matching Supabase Auth Site URL and redirect URLs for the deployed domain.

Never add a Supabase secret or service-role key to a `NEXT_PUBLIC_` variable or browser code. RLS policies are required because the publishable key is used by the browser.
