import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthProvider } from "@/hooks/use-auth";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() {
  return (
    <div style={{backgroundColor: '#F4F6FB'}} className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md animate-slide-up text-center">
        <h1 className="text-8xl font-bold" style={{color: '#0F172A', fontFamily: "'Syne', sans-serif"}}>404</h1>
        <p className="mt-4 text-sm" style={{color: '#9AA3B8'}}>This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-block rounded-lg px-6 py-3 text-sm font-semibold text-white transition-smooth hover:scale-105" style={{backgroundColor: '#4F46E5'}}>
          Go home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div style={{backgroundColor: '#F4F6FB'}} className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md animate-slide-up text-center">
        <h1 className="text-2xl font-bold" style={{color: '#0F172A', fontFamily: "'Syne', sans-serif"}}>Something went wrong</h1>
        <p className="mt-3 text-sm" style={{color: '#9AA3B8'}}>{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-lg px-6 py-3 text-sm font-semibold text-white transition-smooth hover:scale-105"
          style={{backgroundColor: '#4F46E5'}}
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function AuthInvalidator() {
  const router = useRouter();
  const qc = useQueryClient();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      router.invalidate();
      qc.invalidateQueries();
    });
    return () => subscription.unsubscribe();
  }, [router, qc]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AuthInvalidator />
        <Outlet />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
