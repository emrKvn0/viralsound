# ViralSound

A modern web application for discovering, previewing, and organizing 15–30 second viral song hooks/choruses for content creators, video editors, and music lovers.

## Features

- **Discover**: Search tracks and browse trending hits with instant 15–30s audio previews.
- **Roulette**: Spin through curated viral tracks to discover new sounds quickly.
- **Collections & Favorites**: Save tracks to personal favorites or organize them into custom collections.
- **Floating Audio Player**: Continuous playback across tabs with play/pause and track controls.
- **TikTok Music Redirection**: Direct search/page links for matching TikTok audio pages.
- **Authentication**: User accounts and persistent personal libraries powered by Auth.js (NextAuth v5) and Prisma.

## Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Lucide Icons
- **Database & ORM**: PostgreSQL + Prisma ORM
- **Auth**: Auth.js (`next-auth` v5) with Prisma Adapter
- **Data Fetching**: TanStack Query v5

## Getting Started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Copy `.env.example` to `.env` and fill in your credentials:

   ```bash
   cp .env.example .env
   ```

   Required variables:
   - `DATABASE_URL` — PostgreSQL connection string
   - `AUTH_SECRET` — Auth.js secret key
   - `AUTH_URL` — Application URL (e.g. `http://localhost:3000`)
   - `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET` — Spotify Web API credentials

3. **Set up the database**

   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.
