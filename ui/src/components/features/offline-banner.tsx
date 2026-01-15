import { WifiOff } from "lucide-react";

import { useOnlineStatus } from "@/hooks/use-online-status";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-amber-500 px-4 py-2 text-center text-amber-950 sm:bottom-auto sm:top-0">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="size-4" />
        <span>You&apos;re offline. Some features may not work.</span>
      </div>
    </div>
  );
}
