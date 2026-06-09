# Changelog

All notable changes to **Project Manager Frontend** are documented in this file.

This project follows a learning-and-portfolio release cadence. Versions are tagged
when the frontend reaches a stable, demoable state. Dates use the format `YYYY-MM-DD`.

---

## v1.1.2 - 2026-06-05

Incremental release focused on design polish, AI automation hardening, sprints
management, and demo onboarding.

### Highlights

- **Sprints module**. New domain with its own API, hooks, types, schemas, and pages.
  - Sprint list with search, date-range filters, and state filters
    (`Planned`, `Active`, `Completed`, `Canceled`).
  - Sprint detail rendered as a Kanban board with four columns
    (`Todo`, `In Progress`, `Done`, `Canceled`).
  - Drag-and-drop task assignment powered by `@dnd-kit/core`, with state updates
    and sprint assignment in a single round-trip.
  - Sprint CRUD: create, edit (name, goal, start/end dates, state), and delete.
  - Assign / unassign a task to or from a sprint.
- **AI Task Automation hardening**.
  - New **Stage 0 preprocessor** in TypeScript: language detection (es / en),
    meeting-date detection, inline ISO date tagging, member tagging, and
    `>>> TASK START >>>` boundary markers — runs before the model is loaded.
  - **Self-correction retry pass** for the LLM: on invalid JSON, the pipeline
    re-prompts the model with the error at a lower temperature (`0.05` vs `0.1`)
    before falling back.
  - **60s hard timeout** on the LLM call. Slow or hung models never block the UI.
  - **GPU OOM** is detected separately and surfaces a helpful message suggesting
    a smaller model from the in-app selector (Qwen 1.5B or Llama 1B).
  - `forceFallback` flag added to the agent input to skip the LLM entirely
    (useful for tests and for users without WebGPU).
  - In-app model selector: `Qwen 2.5 1.5B`, `Llama 3.2 1B`, `Gemma 2 2B`,
    `Phi-3.5 mini` (default).
  - Deterministic fallback parser (structured + natural modes) emits the
    same `LlmItemExtraction` shape as the LLM, so the consolidator stays
    agnostic to the source.
  - Review modal now accumulates drafts across consecutive extractions, clears
    state on close, and exposes an expandable process log.
- **Tasks and Projects refinements**.
  - `startAt` and `completedAt` date fields wired through tasks and sprints.
  - Task list filter bar with member and sprint filters.
  - Project member management and per-member role resolution helpers.
  - Task state mapping fixes and improved task API normalization.
  - In-progress Kanban polish for the project view.
- **Demo onboarding**.
  - "Login as Demo" button is fully wired and can be toggled via
    `VITE_DEMO_EMAIL` / `VITE_DEMO_PASSWORD`.
  - Demo transcript samples for the AI automation flow.
  - Social links and icons in the public task list.
- **Users and Pro plan**.
  - `GET /users/me/stats` integration powering the avatar menu.
  - Pro plan sidebar and in-app upgrade modal with `canvas-confetti` feedback.
- **CI**: GitHub Actions workflow runs install, lint, typecheck, format check,
  tests, and build on every push and pull request.

### Technical Improvements

- New `features/sprints` and `features/users` domains with full layering
  (api, hooks, types, schemas, components, pages).
- New `features/tasks/ai` package: `transcriptPreprocessor`,
  `transcriptTaskAgent`, `transcriptTaskSchemas`.
- React Router v7 upgrade.
- React 19 + Vite 8 toolchain refresh.
- ESLint config reworked for React Hooks and React Refresh.
- Prettier applied repository-wide; `format:check` is part of CI.
- Destructive / noisy `console.log` calls cleaned up; only the AI debug
  pair (`[AI DEBUG] Raw LLM extraction`, `[AI DEBUG] Consolidated drafts`)
  remains.
- Footer removed in favor of a cleaner shell.
- Project permissions helper (`projectPermissions.ts`) centralized.

### Deployment

- `vercel.json` SPA rewrite confirmed to work with all new routes, including
  sprint sub-views (`/projects/:id?view=sprints`).
- Frontend is configured to talk to the deployed Render backend at
  `https://projectmanagerbackend-f8df.onrender.com/api` via `VITE_API_URL`.

### Notes

- React Query cache is still in-memory only (not persisted to `localStorage`).
- The local LLM still requires WebGPU. Browsers without WebGPU or users on
  devices that run out of memory will be served by the deterministic fallback
  parser transparently.
- This is still a **learning and portfolio project**, not a commercial product.

### Future Roadmap

- Persist React Query cache for offline-friendly reloads.
- Promote Sprints to a first-class top-level route (currently a project sub-view).
- Expand feature and integration test coverage.
- Continue tightening loading, empty, and error states across the remaining flows.

---

## v1.0.0 - 2026-05-19

First stable release of Project Manager Frontend.

### Highlights

- Authentication flow with login, register, session persistence, and protected routes.
- Projects dashboard with create, edit, delete, list, and detail views.
- Tasks experience with global and project-scoped views.
- Task comments with create, edit, delete, and list support.
- Production-ready frontend deployment prepared for Vercel.
- Integration with the backend deployed on Render.

### Technical Improvements

- Feature-based architecture organized by domain.
- Centralized Axios client with automatic JWT authorization header injection.
- Session persistence through `localStorage` using the `authResponse` key.
- TanStack Query for in-memory server-state caching and selective invalidation.
- Zod-based environment validation and form validation.
- Shared UI and layout shell for consistent navigation across the app.

### Deployment

- Frontend is configured for Vercel deployment.
- SPA routing is supported through `vercel.json` rewrites.
- Backend API URL is injected through `VITE_API_URL`.
- The frontend is ready to connect to the deployed Render backend at
  `https://projectmanagerbackend-f8df.onrender.com/api`.

### Notes

- React Query cache is not persisted to `localStorage` in this release.
- JWT session data is persisted locally and rehydrated on app startup.
- The project is intentionally scoped as a learning and portfolio application.

### Future Roadmap

- Persist React Query cache if offline or reload restoration becomes necessary.
- Expand UI polish for loading, empty, and error states.
- Increase automated test coverage across feature flows.
