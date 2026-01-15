import { Cog, Terminal } from "lucide-react";

import { AppLayout } from "@/components/layout/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SettingsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">
            Configure CLI settings and global options
          </p>
        </div>

        {/* Settings Sections */}
        <div className="grid gap-6">
          {/* CLI Configuration Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="size-5" />
                CLI Configuration
              </CardTitle>
              <CardDescription>
                Configure the Claude CLI path and check its health status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                CLI Configuration settings will be added in Commit 7.2
              </p>
            </CardContent>
          </Card>

          {/* Global Settings Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="size-5" />
                Global Settings
              </CardTitle>
              <CardDescription>
                Configure execution limits and default timeout values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Global settings will be added in Commit 7.3
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
