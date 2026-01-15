import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";

import { AppSidebar } from "@/components/layout/app-sidebar.tsx";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar.tsx";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface BreadcrumbItemType {
  label: string;
  href?: string;
}

interface AppLayoutProps {
  fluid?: boolean;
  breadcrumbs?: BreadcrumbItemType[];
  actions?: ReactNode;
  children: ReactNode;
}

export const AppLayout = ({
  fluid = false,
  breadcrumbs,
  actions,
  children,
}: AppLayoutProps) => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />

            {breadcrumbs && breadcrumbs.length > 0 && (
              <>
                <Separator orientation="vertical" className="mx-2 h-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    {isMobile ? (
                      <BreadcrumbItem>
                        <BreadcrumbPage>
                          {breadcrumbs[breadcrumbs.length - 1].label}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    ) : (
                      breadcrumbs.map((item, index) => (
                        <Fragment key={index}>
                          {index > 0 && <BreadcrumbSeparator />}
                          <BreadcrumbItem>
                            {item.href ? (
                              <BreadcrumbLink asChild>
                                <Link to={item.href}>{item.label}</Link>
                              </BreadcrumbLink>
                            ) : (
                              <BreadcrumbPage>{item.label}</BreadcrumbPage>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      ))
                    )}
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            )}

            {actions && (
              <div className="ml-auto flex items-center gap-2">{actions}</div>
            )}
          </div>
        </header>

        <div className="p-4">
          <div className={cn("mx-auto", fluid ? "w-full" : "max-w-5xl")}>
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
