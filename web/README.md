# IELTS Mock Platform — Web App

Next.js frontend for the IELTS Mock Exam ERP.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/login`.

## Auth routes (implemented)

| Route | Description |
|-------|-------------|
| `/login` | Sign in |
| `/register` | Create student account |
| `/forgot-password` | Password reset request |
| `/dashboard` | Placeholder after sign-in |

## Stack

- Next.js 16 · React 19 · TypeScript
- Tailwind CSS 4
- React Hook Form + Zod
- Lucide icons

## Improvements over Figma export

- Removed third-party test-centre branding; uses "Computer-delivered IELTS CBT"
- Form validation with accessible error states
- Loading states on submit
- Password visibility toggle
- Registration success feedback on login
- Forgot-password confirmation state
- Responsive layout (marketing panel on desktop, logo on mobile)
- Inter font + design tokens for ERP consistency
