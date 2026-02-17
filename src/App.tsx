import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { StreamSessionProvider } from "@/hooks/useStreamSession";
import { LanguageProvider } from "@/hooks/useLanguage";
import { PerformanceModeProvider } from "@/hooks/usePerformanceMode";
import { ThemeWrapper } from "@/components/ThemeWrapper";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { PerformancePrompt } from "@/components/PerformancePrompt";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import Discovery from "./pages/Discovery";
import StreamerPage from "./pages/StreamerPage";
import StreamerProfilePage from "./pages/StreamerProfilePage";
import StreamerSettings from "./pages/StreamerSettings";
import StreamerDashboard from "./pages/StreamerDashboard";
import StreamerPayments from "./pages/StreamerPayments";
import StreamerStatistics from "./pages/StreamerStatistics";
import Settings from "./pages/Settings";
import Dashboard from "./pages/Dashboard";
import UserDashboard from "./pages/UserDashboard";
import Library from "./pages/Library";
import Auth from "./pages/Auth";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Imprint from "./pages/Imprint";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import CookiePolicy from "./pages/CookiePolicy";
import Support from "./pages/Support";

const queryClient = new QueryClient();

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <PerformanceModeProvider>
          <AuthProvider>
            <StreamSessionProvider>
              <ThemeWrapper>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <PerformancePrompt />
                  <BrowserRouter>
                    <Routes>
                      <Route path="/" element={<Discovery />} />
                      <Route path="/imprint" element={<Imprint />} />
                      <Route path="/privacy" element={<PrivacyPolicy />} />
                      <Route path="/terms" element={<TermsOfService />} />
                      <Route path="/cookies" element={<CookiePolicy />} />
                      <Route path="/support" element={<Support />} />
                      <Route path="/library" element={<Library />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/admin/dashboard" element={<Auth />} />
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute requireAdmin>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/user/dashboard"
                        element={
                          <ProtectedRoute>
                            <UserDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/streamer/dashboard"
                        element={
                          <ProtectedRoute>
                            <StreamerDashboard />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/streamer/:slug/dashboard"
                        element={
                          <ProtectedRoute>
                            <StreamerDashboard />
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
                      <Route
                        path="/streamer/payments"
                        element={
                          <ProtectedRoute>
                            <StreamerPayments />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/streamer/statistics"
                        element={
                          <ProtectedRoute>
                            <StreamerStatistics />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute>
                            <Settings />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute>
                            <Profile />
                          </ProtectedRoute>
                        }
                      />
                      {/* Streamer pages - must be after all other routes */}
                      <Route path="/:slug/submit" element={<StreamerPage />} />
                      <Route path="/:slug" element={<StreamerProfilePage />} />
                      {/* 404 catch-all */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </BrowserRouter>
                </TooltipProvider>
              </ThemeWrapper>
            </StreamSessionProvider>
          </AuthProvider>
        </PerformanceModeProvider>
      </LanguageProvider>
    </QueryClientProvider>
  </AppErrorBoundary>
);

export default App;
