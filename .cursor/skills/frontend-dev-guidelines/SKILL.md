---
name: frontend-dev-guidelines
description: Frontend development guidelines for Next.js 16 App Router applications. Modern patterns including Server Components, Server Actions, Suspense streaming, file-based routing, MUI v7 styling, Turbopack, React Compiler, performance optimization, and TypeScript best practices. Use when creating components, pages, features, fetching data, styling, routing, or working with frontend code.
---

# Frontend Development Guidelines

## Purpose

Comprehensive guide for modern Next.js 16 development with the App Router and Turbopack, emphasizing Server Components for data fetching, Server Actions for mutations, Suspense streaming, proper file organization, and performance optimization.

## When to Use This Skill

- Creating new components or pages
- Building new features
- Fetching data (Server Components, Server Actions)
- Setting up routes (Next.js App Router)
- Styling components with MUI v7
- Performance optimization
- Organizing frontend code
- TypeScript best practices

---

## Quick Start

### New Component Checklist

Creating a component? Follow this checklist:

- [ ] Server Component by default (no directive needed)
- [ ] Add `'use client'` only if it needs interactivity (state, effects, event handlers)
- [ ] Use `React.FC<Props>` pattern with TypeScript for client components
- [ ] Import aliases: `@/` for `src/`
- [ ] Styles: MUI `sx` prop or Tailwind classes
- [ ] React Compiler handles memoization automatically; manual `useCallback`/`useMemo` only if profiling shows a need
- [ ] Default export at bottom
- [ ] Use `useMuiSnackbar` for user notifications (client components)

### New Feature Checklist

Creating a feature? Set up this structure:

- [ ] Create `app/(admin)/<feature>/page.tsx` (Server Component)
- [ ] Create `app/(admin)/<feature>/loading.tsx` (Suspense fallback)
- [ ] Create `app/(admin)/<feature>/error.tsx` (error boundary, `'use client'`)
- [ ] Create pure fetch functions in `src/api/<feature>/api.ts` (uses native `fetch`)
- [ ] Create TanStack Query hooks in `src/api/<feature>/hooks/use*.ts`
- [ ] Create Server Actions in `src/api/<feature>/actions.ts` (mutations)
- [ ] Create types in `src/api/<feature>/types.ts`
- [ ] Create client components in `src/components/dashboard/<feature>/`
- [ ] Update navigation in `src/components/dashboard/Dashboard.tsx`

---

## Import Aliases Quick Reference

| Alias | Resolves To | Example                                           |
| ----- | ----------- | ------------------------------------------------- |
| `@/`  | `src/`      | `import { API_BASE_URL } from '@/api/shared/api'` |

Defined in: `tsconfig.json`

---

## Common Imports Cheatsheet

```typescript
// React (client components only)
import { useState, useCallback, useMemo } from 'react';

// MUI Components
import { Box, Paper, Typography, Button, Grid } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

// Next.js
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { Suspense } from 'react';

// Project
import { API_BASE_URL } from '@/api/shared/api';

// Hooks (client components)
import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';
```

---

## Topic Guides

### Component Patterns

**Server Components (default):**

- No directive needed — components in `app/` are Server Components by default
- Can `await` async data directly in the component body
- Cannot use hooks, event handlers, or browser APIs
- Pass fetched data as props to client components

**Client Components (`'use client'`):**

- Required for interactivity: state, effects, event handlers, browser APIs
- Keep as small and leaf-level as possible
- Receive data via props from Server Components
- Component structure: Props → Hooks → Handlers → Render → Export

**Key Concepts:**

- Default to Server Components; only add `'use client'` when needed
- Use `<Suspense>` with `loading.tsx` for streaming
- Compose: Server Component fetches data → passes to Client Component for interactivity

---

### Data Fetching

All HTTP requests use the native `fetch` API. Data fetching uses two patterns depending on context:

**PATTERN 1: Server Components + `fetch` (SSR)**

```typescript
// app/(admin)/stores/page.tsx — Server Component (default)
import { fetchStores } from '@/api/stores/api';
import { StoreList } from '@/components/dashboard/stores/StoreList';

export default async function StoresPage() {
  const stores = await fetchStores();
  return <StoreList stores={stores} />;
}
```

**PATTERN 2: TanStack Query + `fetch` (Client Components)**

```typescript
// src/api/stores/hooks/useFetchStores.ts — TanStack Query wrapper
import { useQuery } from '@tanstack/react-query';
import { fetchStores } from '../api';
import type { Store } from '../types';

export function useFetchStores() {
  return useQuery<Store[], Error>({
    queryKey: ['stores'],
    queryFn: fetchStores,
  });
}

// Client component using the hook
('use client');
import { useFetchStores } from '@/api/stores/hooks/useFetchStores';

export function StoreList() {
  const { data: stores, isLoading, error } = useFetchStores();
  // render with loading/error states
}
```

**Query Key Factories (use for all features):**

```typescript
// src/api/stores/query-keys.ts
export const storeKeys = {
  all: ['stores'] as const,
  lists: () => [...storeKeys.all, 'list'] as const,
  list: (filters: object) => [...storeKeys.lists(), filters] as const,
  details: () => [...storeKeys.all, 'detail'] as const,
  detail: (id: string) => [...storeKeys.details(), id] as const,
};

// Usage: queryKey: storeKeys.detail(id)
// Invalidate all lists: queryClient.invalidateQueries({ queryKey: storeKeys.lists() })
```

**TanStack Query Mutations (`useMutation`):**

Use `useMutation` for client-initiated mutations that need immediate UI feedback (e.g., inline edit, delete with undo). For form submissions, prefer Server Actions.

```typescript
// src/api/stores/hooks/useDeleteStore.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteStore } from '../api';
import { storeKeys } from '../query-keys';

export function useDeleteStore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteStore(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: storeKeys.lists() });
    },
  });
}

// Usage in component:
// const { mutate: deleteStore, isPending } = useDeleteStore();
// <Button onClick={() => deleteStore(id)} disabled={isPending}>Delete</Button>
```

**`useSuspenseQuery` + `<Suspense>` (preferred for streaming):**

Use `useSuspenseQuery` instead of `useQuery` when the component is wrapped in a `<Suspense>` boundary. Eliminates `isLoading` checks — the component always receives data.

```typescript
// src/components/dashboard/stores/StoreList.tsx
'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchStores } from '@/api/stores/api';
import { storeKeys } from '@/api/stores/query-keys';

export function StoreList() {
  // data is never undefined — Suspense handles the loading state
  const { data: stores } = useSuspenseQuery({
    queryKey: storeKeys.lists(),
    queryFn: fetchStores,
  });

  return <ul>{stores.map((store) => <li key={store.id}>{store.name}</li>)}</ul>;
}

// In the page/parent, wrap with Suspense:
// <Suspense fallback={<StoresSkeleton />}>
//   <StoreList />
// </Suspense>
```

**Server Component Prefetching with `HydrationBoundary` (avoids client waterfall):**

Prefetch in a Server Component to seed the TanStack Query cache before the client renders. The client component gets data immediately with no loading state.

```typescript
// app/(admin)/stores/page.tsx — Server Component
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';
import { fetchStores } from '@/api/stores/api';
import { storeKeys } from '@/api/stores/query-keys';
import { StoreList } from '@/components/dashboard/stores/StoreList';

export default async function StoresPage() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: storeKeys.lists(),
    queryFn: fetchStores,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <StoreList />
    </HydrationBoundary>
  );
}
```

**API Service Layer (pure fetch functions):**

```typescript
// src/api/stores/api.ts — Pure fetch functions (no React dependencies)
import { API_BASE_URL } from '@/api/shared/api';
import type { Store } from '@/api/stores/types';

export async function fetchStores(): Promise<Store[]> {
  const res = await fetch(`${API_BASE_URL}/api/stores`, {
    next: { tags: ['stores'] },
  });
  if (!res.ok) throw new Error('Failed to fetch stores');
  return res.json();
}

export async function fetchStore(id: string): Promise<Store> {
  const res = await fetch(`${API_BASE_URL}/api/stores/${id}`, {
    next: { tags: [`store-${id}`] },
  });
  if (!res.ok) throw new Error('Failed to fetch store');
  return res.json();
}
```

**Server Actions (mutations):**

```typescript
// src/api/stores/actions.ts
'use server';

import { revalidateTag } from 'next/cache';
import { API_BASE_URL } from '@/api/shared/api';
import type { CreateStoreInput } from '@/api/stores/types';

export async function createStore(input: CreateStoreInput) {
  const res = await fetch(`${API_BASE_URL}/api/stores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    throw new Error('Failed to create store');
  }

  revalidateTag('stores');
  return res.json();
}
```

**Caching & Revalidation:**

- Use `next: { tags: ['tag'] }` on server-side fetch for tag-based revalidation
- Use `next: { revalidate: 60 }` for time-based revalidation
- Call `revalidateTag('tag')` or `revalidatePath('/path')` in Server Actions after mutations
- Default: server-side fetch requests are cached; opt out with `cache: 'no-store'`
- Client-side: TanStack Query manages its own cache; use `invalidateQueries` after mutations

---

### File Organization

**`app/` vs `src/`:**

- `app/`: Routes, layouts, loading/error boundaries (Next.js App Router)
- `src/api/`: Pure fetch functions, TanStack Query hooks, and Server Actions
- `src/components/`: Reusable UI components (both server and client)

**Feature structure:**

```
app/(admin)/
  stores/
    page.tsx              # Server Component — fetches and renders
    loading.tsx           # Suspense fallback
    error.tsx             # Error boundary ('use client')
    [id]/
      page.tsx            # Dynamic route

src/
  api/
    stores/
      api.ts              # Pure fetch functions (no React dependencies)
      hooks/
        useFetchStores.ts # TanStack Query hook wrapping fetch
        index.ts          # Re-exports
      actions.ts          # Server Actions (mutations)
      types.ts            # TypeScript types
    shared/
      api.ts              # API_BASE_URL config

  components/
    dashboard/
      stores/
        StoreList.tsx     # Client component (uses TanStack Query hooks)
        StoreCard.tsx     # Presentation component
      Dashboard.tsx       # Main dashboard layout
    shared/
      ...                 # Reusable building blocks
```

---

### Styling

**Inline vs Separate:**

- <100 lines: Inline `const styles: Record<string, SxProps<Theme>>`
- > 100 lines: Separate `.styles.ts` file

**Primary Method:**

- Use `sx` prop for MUI components
- Type-safe with `SxProps<Theme>`
- Theme access: `(theme) => theme.palette.primary.main`

**MUI v7 Grid:**

```typescript
<Grid size={{ xs: 12, md: 6 }}>  // ✅ v7 syntax
<Grid xs={12} md={6}>             // ❌ Old syntax
```

---

### Routing

**Next.js App Router — File-Based:**

```
app/
  (admin)/
    layout.tsx            # Dashboard shell wrapper
    admin/
      page.tsx            # /admin
    stores/
      page.tsx            # /stores
      loading.tsx         # Loading state
      error.tsx           # Error boundary
      [id]/
        page.tsx          # /stores/:id
    organizations/
      page.tsx            # /organizations
```

**Dynamic routes:**

```typescript
// app/(admin)/stores/[id]/page.tsx
interface StorePageProps {
  params: Promise<{ id: string }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { id } = await params;
  const store = await fetchStore(id);
  return <StoreDetail store={store} />;
}
```

---

### Loading & Error States

**Loading (Suspense Streaming):**

```typescript
// app/(admin)/stores/loading.tsx
import { Box, CircularProgress } from '@mui/material';

export default function StoresLoading() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
      <CircularProgress />
    </Box>
  );
}
```

**Granular Suspense within a page:**

```typescript
// app/(admin)/admin/page.tsx
import { Suspense } from 'react';
import { StoresSummary } from '@/components/dashboard/admin/StoresSummary';
import { RecentActivity } from '@/components/dashboard/admin/RecentActivity';

export default function AdminPage() {
  return (
    <>
      <Suspense fallback={<SummarySkeleton />}>
        <StoresSummary />
      </Suspense>
      <Suspense fallback={<ActivitySkeleton />}>
        <RecentActivity />
      </Suspense>
    </>
  );
}
```

**Error Boundaries:**

```typescript
// app/(admin)/stores/error.tsx
'use client';

import { Box, Typography, Button } from '@mui/material';

export default function StoresError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h6" color="error">
        Something went wrong
      </Typography>
      <Button onClick={reset} sx={{ mt: 2 }}>
        Try again
      </Button>
    </Box>
  );
}
```

**Client-side notifications:**

- Use `useMuiSnackbar` for user feedback in client components
- NEVER `react-toastify`

---

### Performance

**Optimization Patterns:**

- Server Components by default (zero client JS for data display)
- `<Suspense>` for streaming — show content as it loads
- `loading.tsx` for route-level loading states
- `useMemo`: Expensive computations in client components
- `useCallback`: Event handlers passed to children in client components
- `React.memo`: Expensive client components
- Dynamic imports: `next/dynamic` for heavy client components

---

### TypeScript

**Standards:**

- Strict mode, no `any` type
- Explicit return types on functions
- Type imports: `import type { Store } from '@/api/stores/types'`
- Component prop interfaces with JSDoc

---

### Common Patterns

**Forms with Server Actions:**

```typescript
// Client component with form
'use client';

import { useActionState } from 'react';
import { createStore } from '@/api/stores/actions';

export function CreateStoreForm() {
  const [state, formAction, isPending] = useActionState(createStore, null);

  return (
    <form action={formAction}>
      {/* form fields */}
      <Button type="submit" disabled={isPending}>
        Create
      </Button>
    </form>
  );
}
```

**Mutation with client feedback:**

```typescript
'use client';

import { useMuiSnackbar } from '@/hooks/useMuiSnackbar';
import { deleteStore } from '@/api/stores/actions';

export function DeleteStoreButton({ id }: { id: string }) {
  const { showSnackbar } = useMuiSnackbar();

  async function handleDelete() {
    try {
      await deleteStore(id);
      showSnackbar('Store deleted', 'success');
    } catch {
      showSnackbar('Failed to delete store', 'error');
    }
  }

  return <Button onClick={handleDelete}>Delete</Button>;
}
```

---

## Core Principles

1. **Server Components by Default**: Only add `'use client'` when interactivity is needed
2. **TanStack Query + `fetch` for Data Fetching**: Pure `fetch` functions in API layer, TanStack Query hooks for client components, direct `await` in Server Components
3. **Zustand for Client State**: Shared/global UI state; `useState`/`useReducer` for local state
4. **Server Actions for Mutations**: Use `revalidatePath`/`revalidateTag` for cache invalidation
5. **Suspense for Loading**: Use `loading.tsx` and `<Suspense>` boundaries
6. **Error Boundaries**: Use `error.tsx` for graceful error handling
7. **Styles Based on Size**: <100 inline, >100 separate
8. **Import Alias**: Use `@/` for `src/`
9. **useMuiSnackbar**: For all client-side user notifications

---

## Quick Reference: File Structure

```
app/
  layout.tsx                  # Root layout (Providers)
  page.tsx                    # Root redirect
  (admin)/
    layout.tsx                # Dashboard shell
    admin/
      page.tsx                # /admin — Server Component
    stores/
      page.tsx                # /stores — Server Component
      loading.tsx             # Loading fallback
      error.tsx               # Error boundary
      [id]/
        page.tsx              # /stores/:id

src/
  api/
    stores/
      api.ts                  # Pure fetch functions (no React deps)
      hooks/
        useFetchStores.ts     # TanStack Query hook
        index.ts              # Re-exports
      actions.ts              # Server Actions (mutations)
      types.ts                # TypeScript types
    shared/
      api.ts                  # API_BASE_URL config

  components/
    dashboard/
      Dashboard.tsx           # Main dashboard layout
      stores/
        StoreList.tsx         # Client component (TanStack Query)
        StoreCard.tsx         # Presentation component
    providers/
      Providers.tsx           # MUI + Theme + QueryClient providers
    shared/
      ...                     # Reusable components

  hooks/
    useResponsive.ts          # Responsive breakpoint hook
  theme/
    ThemeProvider.tsx          # MUI theme provider
    theme.ts                  # Theme configuration
```

---

## Modern Page Template (Quick Copy)

```typescript
// app/(admin)/stores/page.tsx — Server Component
import { fetchStores } from '@/api/stores/api';
import { StoreList } from '@/components/dashboard/stores/StoreList';

export default async function StoresPage() {
  const stores = await fetchStores();
  return <StoreList stores={stores} />;
}
```

```typescript
// src/components/dashboard/stores/StoreList.tsx — Client Component
'use client';

import { useState, useCallback } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import type { Store } from '@/api/stores/types';

interface StoreListProps {
  stores: Store[];
}

export const StoreList: React.FC<StoreListProps> = ({ stores }) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []);

  return (
    <Box sx={{ p: 2 }}>
      {stores.map((store) => (
        <Paper
          key={store.id}
          sx={{ p: 3, mb: 2, cursor: 'pointer' }}
          onClick={() => handleSelect(store.id)}
        >
          <Typography variant="h6">{store.name}</Typography>
        </Paper>
      ))}
    </Box>
  );
};

export default StoreList;
```

---

## Related Skills

- **error-tracking**: Error tracking with Sentry (applies to frontend too)
- **backend-dev-guidelines**: Backend API patterns that frontend consumes

---

**Skill Status**: Modular structure aligned with Next.js 16 App Router patterns
