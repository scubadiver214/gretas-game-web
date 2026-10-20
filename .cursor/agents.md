# agents.md

Agent configurations for the  Menu Admin Admin UI.

> **Primary reference**: All agents must follow the guidance in
> [`.cursor/agents/expert-nextjs-developer.agent.md`](.cursor/agents/expert-nextjs-developer.agent.md)
> for architecture patterns, coding standards, and Next.js 16 conventions.

## Frontend Agent

```
Specialized for React/TypeScript work in --ui.
See .cursor/agents/expert-nextjs-developer.agent.md for full patterns and code examples.

Focus areas:
- app/(admin)/ for route pages, loading, and error boundaries
- src/api/ for server-side fetch functions and Server Actions
- src/components/dashboard/ for client and presentation components

Constraints:
- Use @/ import alias for all src/ imports
- No hardcoded API URLs—use process.env.NEXT_PUBLIC_API_BASE_URL via src/api/shared/api.ts
- No client-side data fetching libraries—use Server Components + Server Actions
- No useEffect for data loading—fetch in Server Components instead
- Follow existing UI style (MUI sx prop or Tailwind) per file
- TypeScript strict mode—no any, use import type for type-only imports
- Always await params and searchParams—they are async Promise<> in Next.js 16
```

## Feature Agent

```
Full-stack feature implementation for --ui.
See .cursor/agents/expert-nextjs-developer.agent.md for full patterns and code examples.

Workflow:
1. Create app/(admin)/<feature>/page.tsx (Server Component)
2. Create app/(admin)/<feature>/loading.tsx (Suspense fallback)
3. Create app/(admin)/<feature>/error.tsx (error boundary, 'use client')
4. Create src/api/<feature>/api.ts (server-side fetch functions)
5. Create src/api/<feature>/actions.ts (Server Actions with 'use server')
6. Create src/api/<feature>/types.ts (TypeScript types)
7. Create src/components/dashboard/<feature>/ (client + presentation components)
8. Update navigationItems in src/components/dashboard/Dashboard.tsx

Constraints:
- Server Components by default—only add 'use client' for interactivity
- Server Actions for mutations—call revalidateTag/revalidatePath after success
- Use useMuiSnackbar for client-side user feedback
- Use useActionState with Server Actions for form submissions
```

## Review Agent

```
Code review focused on --ui project standards.
See .cursor/agents/expert-nextjs-developer.agent.md for full patterns and code examples.

Checks:
- No hardcoded API URLs (must use src/api/shared/api.ts)
- Server Components used for data fetching (no useEffect + fetch)
- Server Actions used for mutations (no client-side API calls)
- TypeScript strict: no any, explicit return types, import type
- @/ import alias used consistently
- params and searchParams awaited in page components
- loading.tsx and error.tsx present for every feature route
- UI library consistency (MUI or Tailwind, not mixed per component)
- MUI v7 Grid syntax: size={{ xs: 12, md: 6 }}
- Existing hooks used (useResponsive, useThemeMode, useMuiSnackbar)
```
