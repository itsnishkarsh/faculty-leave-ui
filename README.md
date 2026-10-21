# Faculty Leave Portal

A Next.js demo for faculty leave requests and HOD review.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Demo roles

- Faculty: `faculty@faculty.demo` / `Faculty123!`
- HOD: `hod@faculty.demo` / `Hod123!`
- Admin: `admin@faculty.demo` / `Admin123!`

Faculty can create requests and track decisions. HODs can approve or reject requests. Admins can create faculty and HOD demo accounts.

## Data and security

This is a browser-only demonstration. Accounts, passwords, sessions, and leave requests are saved in that browser's local storage. They are not shared across users or devices, and local-storage role checks are not secure authentication. Use demo data only; do not enter real staff or leave information.

Deploying the current app publishes the demo UI, but does not make its data shared. A live institutional portal needs hosted authentication and a database with server-side role checks and access policies.

## Production build

```bash
npm run lint
npm run build
```

The production build was verified with `next build --webpack`.

## Deploy a demo preview

The repository is connected to GitHub at `itsnishkarsh/faculty-leave-ui`. Import that repository into [Vercel](https://vercel.com/new), keep the Next.js framework preset and default build settings, then deploy. If Vercel asks for a project root, choose `.` because this repository root contains `package.json`.

For a shared, secure deployment, connect a hosted auth/database service before using real people or data.
