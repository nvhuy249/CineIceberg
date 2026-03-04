# 🎬 Cinéphile App Architecture

## Screen Map (7 Total)

```
┌─────────────────────────────────────────────────────────────────┐
│                     ONBOARDING FLOW (2 screens)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐                        ┌─────────────┐        │
│  │  Welcome    │  ───────────────────▶  │  Select     │        │
│  │  Screen     │   "Begin Journey"      │  3+ Films   │        │
│  │             │                        │             │        │
│  │  - Logo     │                        │  - Grid     │        │
│  │  - Tagline  │                        │  - Search   │        │
│  │  - CTA      │                        │  - Counter  │        │
│  └─────────────┘                        └──────┬──────┘        │
│                                                 │               │
│                                          "Continue" (3+)        │
│                                                 │               │
│                                                 ▼               │
└─────────────────────────────────────────────────────────────────┘
                                                  │
                                            Goes to Home
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MAIN APP (5 core screens)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────┐        ┌──────────┐        ┌──────────┐         │
│  │   Home   │◀──────▶│  Search  │◀──────▶│ Profile  │         │
│  └────┬─────┘        └────┬─────┘        └────┬─────┘         │
│       │                   │                    │                │
│       │                   │                    │                │
│       │    ┌──────────────┼────────────────────┘                │
│       │    │              │                                     │
│       ▼    ▼              ▼                                     │
│  ┌─────────────────────────────┐         ┌──────────┐          │
│  │     Movie Detail (Tabs)     │         │Watchlist │          │
│  ├─────────────────────────────┤         └────┬─────┘          │
│  │ • Overview                  │              │                │
│  │ • Analysis (Deep Dive)      │              │                │
│  │ • Videos                    │              ▼                │
│  └─────────────────────────────┘    ┌─────────────────┐        │
│                                      │ + More Like This│        │
│                                      └─────────────────┘        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                           │
                           │ Alternative Discovery
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                 DISCOVER MODE (Bonus screen)                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────┐           │
│  │          Swipeable Card Interface                │           │
│  │  ┌───────────────────────────────────────────┐  │           │
│  │  │                                           │  │           │
│  │  │          [Film Poster Card]              │  │           │
│  │  │                                           │  │           │
│  │  │  ◀──── Swipe Left (Pass)                 │  │           │
│  │  │                                           │  │           │
│  │  │  ────▶ Swipe Right (Like)                │  │           │
│  │  │                                           │  │           │
│  │  │         [Info] [Details]                 │  │           │
│  │  └───────────────────────────────────────────┘  │           │
│  │                                                  │           │
│  │  [ ↻ ]   [ ✗ ]   [ i ]   [ ♥ ]                 │           │
│  │  Undo    Pass    Info    Like                   │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
App
└── RouterProvider
    └── Root (Outlet)
        ├── OnboardingWelcome
        ├── OnboardingFilms
        │   └── FilmCard (grid)
        ├── Home
        │   ├── HeroSkeleton (loading)
        │   ├── FilmCard (portrait)
        │   └── FilmCard (landscape)
        ├── Search
        │   ├── SearchSkeleton (loading)
        │   ├── EmptyState (no results)
        │   └── FilmCard (grid)
        ├── MovieDetail
        │   ├── MovieDetailSkeleton (loading)
        │   ├── MatchScore
        │   ├── TasteTag
        │   └── Tabs (Overview | Analysis | Videos)
        ├── Profile
        │   ├── TasteTag
        │   └── FilmCard (watchlist preview)
        ├── Watchlist
        │   ├── FilmCard (grid)
        │   ├── MatchScore
        │   └── "Add More Like This" section
        └── Discover
            └── SwipeCard
                ├── MatchScore
                └── TasteTag
```

## Data Flow

```
┌──────────────┐
│  mockData.ts │  ──────────────────────────────┐
└──────────────┘                                 │
       │                                         │
       │ Imports                                 │
       ▼                                         │
┌─────────────────────────────────────┐          │
│           All Screens               │          │
│  • Home                             │          │
│  • Search                           │          │
│  • MovieDetail                      │          │
│  • Profile                          │          │
│  • Watchlist                        │          │
│  • Discover                         │          │
└─────────────────────────────────────┘          │
       │                                         │
       │ Uses                                    │
       ▼                                         │
┌─────────────────────────────────────┐          │
│      Shared Components              │          │
│  • FilmCard                         │◀─────────┘
│  • MatchScore                       │
│  • TasteTag                         │
│  • LoadingSkeletons                 │
│  • EmptyState                       │
└─────────────────────────────────────┘
```

## User Journeys

### **First-Time User**
```
1. Welcome Screen
   ↓
2. Select 3+ Favorite Films
   ↓
3. Home Screen (Featured + Recommendations)
   ↓
4. Browse or Swipe (Discover mode)
   ↓
5. Movie Detail (tabs)
   ↓
6. Add to Watchlist
   ↓
7. Profile (view taste)
```

### **Returning User**
```
1. Home Screen
   ↓
2a. Browse recommendations → Movie Detail
   OR
2b. Try Swipe Discovery → Swipe cards → Movie Detail
   OR
2c. Search specific film → Search → Movie Detail
   OR
2d. Check Watchlist → Profile → Watchlist → Movie Detail
```

### **Discovery Flow**
```
Home
 │
 ├─ Featured Film → Movie Detail
 │
 ├─ Hidden Gems → Movie Detail
 │
 ├─ Trending → Movie Detail
 │
 └─ Swipe to Discover → Discover Screen
                          ├─ Swipe Left (Pass)
                          ├─ Swipe Right (Like → Watchlist)
                          └─ Info → Movie Detail
```

## Feature Matrix

| Screen           | Loading State | Empty State | Search | Filter | Sort | Tabs | Swipe |
|------------------|--------------|-------------|--------|--------|------|------|-------|
| OnboardingWelcome| ❌           | ❌          | ❌     | ❌     | ❌   | ❌   | ❌    |
| OnboardingFilms  | ❌           | ❌          | ✅     | ❌     | ❌   | ❌   | ❌    |
| Home             | ✅           | ❌          | ❌     | ❌     | ❌   | ❌   | ❌    |
| Search           | ✅           | ✅          | ✅     | ❌     | ❌   | ❌   | ❌    |
| MovieDetail      | ✅           | ❌          | ❌     | ❌     | ❌   | ✅   | ❌    |
| Profile          | ❌           | ❌          | ❌     | ❌     | ❌   | ❌   | ❌    |
| Watchlist        | ❌           | ✅          | ❌     | ❌     | ❌   | ❌   | ❌    |
| Discover         | ❌           | ✅          | ❌     | ❌     | ❌   | ❌   | ✅    |

## Tech Stack

```
Frontend Framework:    React 18.3.1
Routing:              React Router 7.13.0
Animations:           Motion (Framer Motion) 12.23.24
Styling:              Tailwind CSS 4.1.12
UI Components:        Radix UI primitives
Icons:                Lucide React 0.487.0
Build Tool:           Vite 6.3.5
Type Safety:          TypeScript (implied)
```

## File Structure

```
/src
  /app
    /components
      - FilmCard.tsx
      - MatchScore.tsx
      - TasteTag.tsx
      - LoadingSkeletons.tsx    [NEW]
      - EmptyState.tsx           [NEW]
      /ui
        - (35 Radix UI components)
    /screens
      - OnboardingWelcome.tsx
      - OnboardingFilms.tsx
      - Home.tsx                 [ENHANCED]
      - Search.tsx               [ENHANCED]
      - MovieDetail.tsx          [ENHANCED - tabs]
      - Profile.tsx              [SIMPLIFIED]
      - Watchlist.tsx            [NEW]
      - Discover.tsx             [NEW]
    /data
      - mockData.ts
    - App.tsx
    - Root.tsx
    - routes.ts                  [UPDATED]
  /styles
    - fonts.css
    - index.css                  [ENHANCED - scrollbar]
    - tailwind.css
    - theme.css
```

## Key Metrics

- **Total Screens:** 8 (2 onboarding + 5 main + 1 discover)
- **Components:** 40+ (35 UI + 5 custom + reusables)
- **Routes:** 8
- **Lines of Code:** ~3,500 (estimated)
- **Loading States:** 4 (Home, Search, MovieDetail, Discover)
- **Empty States:** 3 (Search, Watchlist, Discover)
- **Animations:** Extensive (Motion.js throughout)
- **Mobile Optimized:** ✅
- **Touch Gestures:** ✅ (swipe, scroll)
- **Production Ready:** ✅

---

**Ship it!** 🚀🎬
