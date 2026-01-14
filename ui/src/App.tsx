import { Button } from "@/components/ui/button.tsx";
import { ThemeProvider } from "@/components/ui/theme-provider.tsx";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="flex min-h-svh flex-col items-center justify-center">
        <Button>Click me</Button>
      </div>
    </ThemeProvider>
  );
}

export default App;
