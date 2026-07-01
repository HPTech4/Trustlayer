import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: Layout,
});

function Layout() {
  const { theme, toggleTheme } = useTheme();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center justify-between gap-2 border-b px-4" style={{ borderColor: "var(--border)", backgroundColor: "var(--card)" }}>
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" style={{ color: "var(--muted-foreground)" }} />
            </div>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-smooth"
              style={{ backgroundColor: "var(--sidebar-accent)", color: "var(--sidebar-accent-foreground)", cursor: "pointer" }}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </header>
          <main className="flex-1 overflow-auto" style={{backgroundColor: '#F4F6FB'}}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
