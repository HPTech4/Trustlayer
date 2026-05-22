import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, PlusCircle, History, Shield, LogOut } from "lucide-react";
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

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Submit", url: "/submit", icon: PlusCircle },
  { title: "History", url: "/history", icon: History },
];

export function AppSidebar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { user, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" style={{backgroundColor: '#FFFFFF', borderRight: '1px solid #E4E9F2'}}>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{backgroundColor: '#4F46E5'}}>
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight brand-name" style={{color: '#0F172A'}}>TrustLayer</span>
            <span className="text-xs" style={{color: '#9AA3B8'}}>Risk analysis</span>
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
                      backgroundColor: path === item.url ? '#EEF2FF' : 'transparent',
                      color: path === item.url ? '#4F46E5' : '#6B7280',
                      borderLeft: path === item.url ? '3px solid #4F46E5' : 'none',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (path !== item.url) {
                        e.currentTarget.style.backgroundColor = '#F8F9FC';
                        e.currentTarget.style.color = '#374151';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (path !== item.url) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.color = '#6B7280';
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
        <div className="px-2 pb-2" style={{borderTop: '1px solid #E4E9F2', paddingTop: '8px'}}>
          <div className="truncate text-xs" style={{color: '#9AA3B8'}}>{user?.email}</div>
          <button
            onClick={() => signOut()}
            className="mt-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-smooth"
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #E4E9F2',
              color: '#6B7280',
              borderRadius: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F8F9FC';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
