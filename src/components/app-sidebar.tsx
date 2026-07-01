import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, History, BrainCircuit, Shield, LogOut } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Insights", url: "/insights", icon: BrainCircuit },
  { title: "Submit", url: "/submit", icon: PlusCircle },
  { title: "History", url: "/history", icon: History },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const activeBg = isDark ? "var(--sidebar-accent)" : "#EEF2FF";
  const activeColor = isDark ? "var(--sidebar-accent-foreground)" : "var(--accent)";
  const inactiveColor = isDark ? "var(--sidebar-foreground)" : "#6B7280";
  const hoverBg = isDark ? "rgba(79, 220, 143, 0.16)" : "#F8F9FC";
  const hoverColor = isDark ? "var(--sidebar-foreground)" : "#374151";

  return (
    <Sidebar
      collapsible="none"
      style={{ backgroundColor: "var(--sidebar)", borderRight: "1px solid var(--sidebar-border)" }}
      className="w-72"
    >
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--primary)" }}>
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight brand-name" style={{ color: "var(--accent-dark)" }}>
              TrustLayer
            </span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              Risk analysis
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={path === item.url} 
                    tooltip={item.title}
                    style={{
                      backgroundColor: path === item.url ? activeBg : 'transparent',
                      color: path === item.url ? activeColor : inactiveColor,
                      borderLeft: path === item.url ? '3px solid var(--sidebar-primary)' : 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (path !== item.url) {
                        e.currentTarget.style.backgroundColor = hoverBg;
                        e.currentTarget.style.color = hoverColor;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (path !== item.url) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = inactiveColor;
                      }
                    }}
                  >
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-6 pb-6" style={{ borderTop: "1px solid var(--sidebar-border)", paddingTop: "8px" }}>
          <div className="truncate text-xs" style={{ color: "var(--muted-foreground)" }}>{user?.email}</div>
          <button
            onClick={() => signOut()}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-smooth animate-slide-down"
            style={{
              backgroundColor: "var(--danger)",
              color: "white",
              cursor: "pointer",
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
