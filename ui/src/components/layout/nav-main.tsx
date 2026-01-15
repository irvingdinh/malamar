import { FolderIcon, SquareTerminal } from "lucide-react";
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
