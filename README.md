# Project Manager Frontend

Frontend client for the Project Manager ecosystem, built to practice modern React architecture against a real .NET 8 API.

This is not meant to be a closed enterprise application. It is an evolving technical portfolio where authentication, protected routes, server state, typed forms, and domain-based backend integration are implemented feature by feature.

## Current State

This branch leaves the frontend in a functional state for the main product domains:

- Authentication with login, register, session persistence, and protected routes.
- Projects dashboard with list, create, edit, delete, and detail views.
- Task management with project-scoped and global views.
- Comments attached to tasks from the task detail screen.
- Application shell with navigation, sidebar, and theme switcher.

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Axios
- React Hook Form
- Zod
- Tailwind CSS + DaisyUI
- Vitest
- ESLint + Prettier

## Architecture

The codebase is organized by functional domains, not by generic file type. The goal is for each feature to grow in isolation without turning the project into a shared-components dumping ground.

```text
src/
  app/                 # router, providers, and guards
  features/
    auth/              # login, register, context, and session persistence
    projects/          # dashboard, detail, hooks, and forms
    tasks/             # global list, detail, and mutations
    comments/          # list and composer for task comments
  layouts/             # auth shell and main application shell
  shared/              # HTTP client, reusable UI, config, and utilities
  styles/              # global styles
  tests/               # Vitest tests
```

### Navigation Flow

- Public routes go to login and register.
- Protected routes are guarded by `PrivateRoute`.
- The main shell groups the navbar, sidebar, footer, and page content.

## Local API Integration

The frontend connects to the local backend API through this environment variable:

```env
VITE_API_URL=http://localhost:5081/api
```

That URL is consumed from `src/shared/config/env.ts`, where the environment is validated with Zod before the app boots. If the variable is missing or not a valid URL, the app fails fast.

### Production API URL

For Vercel, set `VITE_API_URL` to your deployed backend URL, for example:

```env
VITE_API_URL=https://projectmanagerbackend-f8df.onrender.com/api
```

This is the only value the frontend needs in order to talk to your deployed API. The same Axios client will keep attaching the JWT automatically after login.

### HTTP Client

All backend communication goes through a centralized Axios client in `src/shared/api/httpClient.ts`.

That client applies three important decisions:

1. It uses `baseURL` from `VITE_API_URL`.
2. It sends `Content-Type: application/json` by default.
3. It automatically injects the `Authorization` header when a session is available.

In practice, features do not make one-off requests with random config. They use a uniform client that already knows how to authenticate and how to surface errors consistently.

## Local Persistence and Cache

It is important to distinguish between authenticated session data and server cache data:

### JWT Session in localStorage

The session is stored in `localStorage` under the `authResponse` key.

That object includes:

- `accessToken`
- `tokenType`
- `expiresAtUtc`
- `user`

When the app starts, `AuthProvider` reads that value, checks whether the token is still valid, and clears it if the session has expired. On login, the new auth response is saved again; on logout, it is removed.

This gives us:

- Session persistence after refresh.
- Auth state rehydration without logging in again.
- Automatic JWT attachment on authenticated requests.

### Server Cache with TanStack Query

The server cache is not persisted to `localStorage` in this branch. It lives in memory through TanStack Query with the following defaults:

- `staleTime` of 5 minutes.
- 1 retry for failed queries.
- Selective invalidation after project, task, and comment mutations.

That means the cache improves navigation speed and reduces redundant requests during the current session, but it is rebuilt on page reload. If persistent query cache is needed later, an explicit persistence layer for React Query should be added.

### Other Local Keys

- The visual theme is also stored in `localStorage` under `theme`.

## Technical Decisions

### 1. Auth context plus localStorage

Authentication lives in a dedicated `AuthProvider` because session state is shared across the app and must survive refreshes. This avoids prop drilling and centralizes login, logout, expiration, and rehydration.

### 2. React Query for server state

Projects, tasks, and comments are remote state, not local state. TanStack Query is used to manage them, with precise invalidation after create, update, and delete operations.

### 3. Domain-based APIs

Each feature owns its own API layer, hooks, types, and forms. That lowers coupling and makes the backend easier to follow by business area.

### 4. Form validation with Zod

Validation is not left to the backend alone. Forms are typed and validated before submit to improve UX and reduce invalid requests.

### 5. Consistent error handling

The API returns Problem Details-style payloads, and the HTTP interceptor converts them into UI-friendly messages. That avoids repeating error parsing across screens.

## Features

### Authentication

- Login and register.
- Session persistence on refresh.
- Token expiration checked on startup.
- Protected private routes.

Related endpoints:

- `POST /api/auth/login`
- `POST /api/auth/register`

### Projects

- Project listing.
- Create and edit from a modal.
- Delete projects.
- Project detail view.

Related endpoints:

- `GET /api/projects`
- `POST /api/projects`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`

### Tasks

- Global tasks view.
- Project-scoped tasks view.
- Detail view with project context.
- Task creation from the page itself.

### Task Comments

- Comment listing by task.
- Create comment.
- Edit own comment.
- Delete own comment.

## Backend Connection

The frontend consumes the local `ProjectManagerBackend` companion service. The flow is:

1. The user logs in or registers.
2. The backend returns an authentication payload with token, token type, expiration, and user data.
3. The frontend stores that response in `localStorage`.
4. The Axios interceptor adds `Authorization: Bearer <token>` to authenticated requests.
5. Features call their domain API and TanStack Query handles cache and synchronization.

## Quick Start

### Requirements

- Node.js 20 or newer
- npm
- `ProjectManagerBackend` running locally

### Install

```bash
npm install
```

### Environment Variables

Create a `.env` file with the following content:

```env
VITE_API_URL=http://localhost:5081/api
VITE_APP_NAME=Project Manager
VITE_ENABLE_DEBUG=true
```

### Run

```bash
npm run dev
```

## Deploying to Vercel

This project is ready to be deployed as a Vite SPA on Vercel.

### Build settings

- Framework preset: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Root directory: leave empty unless the app lives inside a subfolder

### Environment variables

Add these in the Vercel project settings:

```env
VITE_API_URL=https://projectmanagerbackend-f8df.onrender.com/api
VITE_APP_NAME=Project Manager
VITE_ENABLE_DEBUG=false
```

### SPA routing

The repository includes `vercel.json` with a rewrite so React Router routes like `/login`, `/projects`, or `/projects/:id` resolve correctly on refresh.

### Deployment flow

1. Import the repository into Vercel.
2. Keep the root directory at the repository root.
3. Set the environment variables above.
4. Deploy.
5. Verify login, protected routes, and API calls against the Render backend.

## Scripts

- `npm run dev` - starts the development server.
- `npm run build` - type-checks and builds the production bundle.
- `npm run preview` - serves the local production build.
- `npm run test` - runs the Vitest suite.
- `npm run lint` - runs ESLint.
- `npm run lint:fix` - automatically fixes lint issues.
- `npm run typecheck` - runs TypeScript checks.
- `npm run format` - formats files with Prettier.
- `npm run format:check` - verifies formatting.

## Status Matrix

| Domain        | Backend     | Frontend    |
| ------------- | ----------- | ----------- |
| Auth          | Implemented | Implemented |
| Projects      | Implemented | Implemented |
| Tasks         | Implemented | Implemented |
| Task comments | Implemented | Implemented |

## Diagram

```mermaid
flowchart TD
  User[User Browser]

  subgraph FE[ProjectManagerFrontend]
    Router[React Router\nPublic + Private Routes]
    Auth[Auth Context\nlocalStorage Session]
    Query[TanStack Query\nIn-memory server cache]
    Http[Axios Client\nInterceptors]
    Features[Feature Modules\nAuth / Projects / Tasks / Comments]

    Router --> Features
    Features --> Query
    Query --> Http
    Auth --> Http
  end

  subgraph BE[ProjectManagerBackend]
    Api[ASP.NET Core API]
    Jwt[JWT Auth + Authorization Rules]
    Services[Application Services]
    Db[(PostgreSQL)]

    Api --> Jwt
    Api --> Services
    Services --> Db
  end

  User --> Router
  Http -->|HTTP + Bearer Token| Api
```

## Development Notes

- The project is intentionally optimized for learning and incremental growth.
- React Query cache is not persisted to localStorage in this branch.
- JWT session data is persisted and validated on app startup.
- Data synchronization relies on selective invalidation after mutations.
- In production, the frontend should point `VITE_API_URL` to the Render backend, not to localhost.

## Natural Next Steps

- Persist the React Query cache if offline behavior or reload restoration is needed.
- Polish loading, empty, and error states.
- Expand feature-level and integration test coverage.

## Spanish Summary

Este README esta en ingles como idioma principal y deja un resumen breve en espanol para referencia rapida.

- La sesion JWT se guarda en `localStorage` como `authResponse`.
- El cache de datos de TanStack Query vive en memoria y no se persiste en esta rama.
- La API local se configura con `VITE_API_URL=http://localhost:5081/api`.
- La app ya cubre autenticacion, proyectos, tareas y comentarios.

## License

Personal project for learning and portfolio purposes.
