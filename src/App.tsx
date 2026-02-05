import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StreamSessionProvider } from "@/hooks/useStreamSession";
import { LanguageProvider } from "@/hooks/useLanguage";
import { ThemeWrapper } from "@/components/ThemeWrapper";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Discovery from "./pages/Discovery";
import StreamerPage from "./pages/StreamerPage";
import StreamerSettings from "./pages/StreamerSettings";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import Library from "./pages/Library";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Imprint from "./pages/Imprint";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <StreamSessionProvider>
          <ThemeWrapper>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Discovery />} />
                  <Route path="/imprint" element={<Imprint />} />
                  <Route path="/library" element={<Library />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/admin/login" element={<Auth />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute requireAdmin>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/my-dashboard" 
                    element={
                      <ProtectedRoute>
                        <UserDashboard />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/streamer/settings" 
                    element={
                      <ProtectedRoute>
                        <StreamerSettings />
                      </ProtectedRoute>
                    } 
                  />
                  {/* Streamer page - must be after all other routes */}
                  <Route path="/:slug" element={<StreamerPage />} />
                  {/* 404 catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </ThemeWrapper>
        </StreamSessionProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
