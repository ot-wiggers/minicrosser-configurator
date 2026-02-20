# Mini Crosser Konfigurator

Offline-fähige Web-App (PWA) als Angebots-/Bestell-Konfigurator für Mini Crosser Elektromobile.

## Quick Start

```bash
pnpm install
cp .env.example .env.local
# Fill in your env vars (see below)
pnpm dev
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | Resend API key for email sending | Yes (for email) |
| `FROM_EMAIL` | Sender email address (must be verified in Resend) | Yes (for email) |
| `NEXT_PUBLIC_APP_URL` | App URL | No (defaults to localhost) |

## Deploy to Vercel

1. Push repo to GitHub
2. Import in Vercel (vercel.com/new)
3. Set environment variables in Vercel dashboard
4. Deploy — `main` branch auto-deploys

## Resend Setup

1. Create account at resend.com
2. Add and verify your sending domain
3. Create API key
4. Set `RESEND_API_KEY` and `FROM_EMAIL` in env vars

## Brand Colors

Edit `src/app/globals.css` to change the brand colors:

```css
:root {
  --brand: oklch(0.638 0.179 46.5);            /* #E8731A - bold orange */
  --brand-foreground: oklch(1 0 0);             /* white */
  --brand-muted: oklch(0.963 0.018 70);         /* light orange tint */
  --brand-2: oklch(0.324 0.022 256);            /* dark anthracite */
}
```

Convert HEX to OKLCH: use oklch.com

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Zustand (state)
- Dexie.js (IndexedDB)
- pdf-lib (PDF generation)
- Resend (email)
- @ducanh2912/next-pwa

## Project Structure

See `docs/plans/2026-02-20-minicrosser-configurator-design.md`
