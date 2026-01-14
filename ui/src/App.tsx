import { AppLayout } from "@/components/layout/app-layout.tsx";
import { ThemeProvider } from "@/components/ui/theme-provider.tsx";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <AppLayout>
        <p>Lorem ipsum dolor sit amet</p>
      </AppLayout>
    </ThemeProvider>
  );
}

export default App;
