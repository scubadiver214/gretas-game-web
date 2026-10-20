"use client";

import { Suspense, useState, type ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BootstrapGate from "@/components/BootstrapGate";
import MusicDirector from "@/components/MusicDirector";
import theme from "@/theme";

export default function Providers({ children }: { children: ReactNode }) {
  // One QueryClient per browser session; created lazily so SSR never shares it.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={null}>
            <MusicDirector />
          </Suspense>
          <BootstrapGate>{children}</BootstrapGate>
        </QueryClientProvider>
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
