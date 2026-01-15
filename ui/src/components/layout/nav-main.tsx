import { BarChart3, FolderIcon, Play, Settings, SquareTerminal } from "lucide-react";
import { Link, useLocation } from "react-router";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  {
    title: "Dashboard",
    url: "/",
    icon: SquareTerminal,
    isActive: (pathname: string) => pathname === "/",
  },
  {
    title: "Workspaces",
    url: "/workspaces",
    icon: FolderIcon,
    isActive: (pathname: string) =>
      pathname === "/workspaces" || pathname.startsWith("/workspace/"),
  },
  {
    title: "Executions",
    url: "/executions",
    icon: Play,
    isActive: (pathname: string) => pathname.startsWith("/executions"),
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3,
    isActive: (pathname: string) => pathname === "/analytics",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    isActive: (pathname: string) => pathname === "/settings",
  },
];

export function NavMain() {
  const location = useLocation();

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              asChild
              tooltip={item.title}
              isActive={item.isActive(location.pathname)}
            >
              <Link to={item.url}>
                <item.icon />
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
