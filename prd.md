# Project Specification: ViralSound Hub (Hit Preview Aggregator)

You are an expert Senior Full-Stack Developer and UI/UX Designer. Your task is to build a modern, high-performance web application using the absolute latest 2026 tech stack. The app allows users to search, discover, and manage the 15-30 second "hit/viral" parts of songs from platforms like TikTok, mapping them with Spotify/Apple Music preview APIs.

---

## 1. Project Overview & Architecture (2026 Tech Stack)

### Core Concept
A centralized dashboard where content creators, editors, and music lovers can search for any song, instantly play its most viral 15-30 second clip (chorus/hook), save it to custom collections, and get direct links to the official TikTok Audio/Music page.

### Strict Version Requirements
- **Framework:** Next.js 16+ (App Router - utilizing latest Server Actions and PPR/Partial Prerendering)
- **Library:** React 19 (utilizing native `use` hook, Server Components, and optimized hydration)
- **Language:** TypeScript (Strict Mode enabled)
- **Styling:** Tailwind CSS v4 (utilizing the new CSS-first configuration, `@theme` directive, and built-in lightning CSS compiler) + Shadcn/ui (v4 compatible setup)
- **Database ORM:** Prisma ORM (Latest v5/v6) with PostgreSQL (Supabase or Neon)
- **State/Data Fetching:** TanStack Query v5+ (React Query) for seamless client-side caching
- **Authentication:** Auth.js (NextAuth v5) or Clerk (App Router optimized)

---

## 2. API & Data Strategy

Since TikTok doesn't provide a public, free-tier API to stream audio previews directly, the application will use a **Dual-Data Source strategy**:

1. **Audio Preview Source (Spotify/Apple Music Web API):** 
   - When a user searches for a track, fetch data from the Spotify API. 
   - The `preview_url` property in the Spotify track object returns a high-quality 30-second MP3 clip, which by industry standards starts precisely at the song's primary hook/chorus (the viral part).
2. **TikTok Redirection & Mapping:**
   - Dynamically generate TikTok Music search links using the formula: `https://www.tiktok.com/music/` combined with the sanitized track name and artist, OR link directly to a Google-indexed fallback search query (`site:tiktok.com/music Artist - Track`).

---

## 3. Database Schema (Prisma)

Design a lightweight relational database to support user curation:

```prisma
model User {
  id          String       @id @default(cuid())
  email       String       @unique
  name        String?
  collections Collection[]
  favorites   Favorite[]
}

model Collection {
  id          String   @id @default(cuid())
  name        String
  description String?
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tracks      Track[]
  createdAt   DateTime @default(now())
}

model Favorite {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  spotifyId String
  title     String
  artist    String
  albumArt  String?
  previewUrl String
  createdAt DateTime @default(now())
}

model Track {
  id           String       @id @default(cuid())
  spotifyId    String
  title        String
  artist       String
  albumArt     String?
  previewUrl   String
  collections  Collection[]
}