
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import Index from "./pages/Index";
import AddWallpaper from "./pages/AddWallpaper";
import EditWallpaper from "./pages/EditWallpaper";
import AddDevices from "./pages/AddDevices";
import NotFound from "./pages/NotFound";
import UploadWallpaper from "./pages/UploadWallpaper";
import BulkThumbnailEdit from "./pages/BulkThumbnailEdit";
import BannerManagement from "./pages/BannerManagement";

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
            <Route path="/add-wallpaper" element={<AddWallpaper />} />
            <Route path="/upload-wallpaper" element={<UploadWallpaper />} />
            <Route path="/edit-wallpaper" element={<EditWallpaper />} />
            <Route path="/bulk-thumbnail-edit" element={<BulkThumbnailEdit />} />
            <Route path="/add-devices" element={<AddDevices />} />
            <Route path="/banner-management" element={<BannerManagement />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
