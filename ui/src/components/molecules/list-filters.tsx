import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface ListFiltersProps {
  children: ReactNode;
  className?: string;
}

export function ListFilters({ children, className }: ListFiltersProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        "md:flex-row md:items-center md:justify-end",
        className
      )}
    >
      {children}
    </div>
  );
}
