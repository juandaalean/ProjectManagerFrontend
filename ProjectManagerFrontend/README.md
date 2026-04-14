# Project Manager Frontend

Web frontend for consuming Project Manager Backend using React + TypeScript.

The current base is ready to start the MVP with an incremental approach: authentication first, then projects, tasks, and comments.

## Project Goal

- Build a functional and stable frontend for the main project management flow.
- Keep the architecture simple, scalable, and feature-oriented.
- Avoid over-engineering in the first stage.

## MVP Scope

- Login and registration.
- Session persistence with JWT in localStorage (MVP).
- Project CRUD.
- Task CRUD by project.
- Comment listing and creation by task.
- Consistent error handling for `application/problem+json`.
- Session-based private routes.

## Base Stack

- React + TypeScript + Vite
- ESLint + TypeScript strict

Notes:

- The structure is already prepared to integrate React Router, TanStack Query, Axios, Zod, and React Hook Form.
- At this stage, a skeleton was created without coupling all business logic.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Folder Structure

```text
src/
  app/
    App.tsx
    providers.tsx
    router.tsx
  shared/
    api/
      httpClient.ts
      problemDetails.ts
    config/
      env.ts
    ui/
      Button.tsx
      Input.tsx
      Card.tsx
      EmptyState.tsx
      ErrorState.tsx
    utils/
      date.ts
      string.ts
    types/
      common.ts
  features/
    auth/
      api/
      hooks/
      store/
      pages/
      components/
      schemas/
      types/
    projects/
      api/
      hooks/
      pages/
      components/
      schemas/
      types/
    tasks/
      api/
      hooks/
      components/
      schemas/
      types/
    comments/
      api/
      hooks/
      components/
      schemas/
      types/
  layouts/
    AppLayout.tsx
    AuthLayout.tsx
  styles/
    globals.css
  tests/
    auth.test.tsx
    projects.test.tsx
```

## Current Status

- Clean and minimal Vite startup.
- Feature-based structure created.
- Skeleton base files ready to begin real phased integration.

## Recommended Next Step

- Integrate `app/providers.tsx` and `app/router.tsx` into the entrypoint.
- Implement the auth feature (API + store + pages) as the first functional phase.
