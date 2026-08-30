# Dr. Hossam Lotfy — Law Office Platform

Internal operations platform for the law office, built to manage lawyers, clients, cases, court sessions, tasks, locations, notifications, and activity records.

## Technology

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS v4
- PostgreSQL
- Prisma 7

## Project Structure

```text
src/
├── app/          # Routes, pages, and API endpoints
├── components/   # Reusable UI and feature components
└── lib/          # Shared application logic and data access

prisma/           # Database schema, migrations, and seed data
public/           # Static assets
scripts/          # Database and deployment utilities
docs/             # Project documentation
```

## Local Development

```bash
cp .env.example .env
npm install
npm run db:setup
npm run db:seed
npm run dev
```

For a production build:

```bash
npm run build
npm start
```

## Main Modules

- Authentication and role-based access
- Lawyer profiles and administration
- Client profiles and case relationships
- Case archive and case history
- Court sessions and calendar
- Tasks and assignments
- Lawyer guide and locations directory
- Notifications and activity tracking
- Search
- File uploads

## Security

Authentication, authorization, database access, signed sessions, access tokens, and upload validation are handled server-side. Environment variables are used for secrets and credentials.
