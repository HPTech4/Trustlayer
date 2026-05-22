import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { supabase } from "@/integrations/supabase/client";

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
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 items-center gap-2 border-b" style={{borderColor: '#E4E9F2', backgroundColor: '#FFFFFF'}}>
            <SidebarTrigger style={{color: '#9AA3B8'}} />
          </header>
          <main className="flex-1 overflow-auto" style={{backgroundColor: '#F4F6FB'}}>
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
