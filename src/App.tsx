
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import Index from "./pages/Index";
import Categories from "./pages/Categories";
import AddWallpaper from "./pages/AddWallpaper";
import EditWallpaper from "./pages/EditWallpaper";
import PaywallBanners from "./pages/PaywallBanners";
import NotFound from "./pages/NotFound";
const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider defaultTheme="light">
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/add-wallpaper" element={<AddWallpaper />} />
            <Route path="/edit-wallpaper" element={<EditWallpaper />} />
            <Route path="/paywall-banners" element={<PaywallBanners />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
