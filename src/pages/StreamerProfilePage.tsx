import type { ReactNode } from "react";
import { Navigate, useParams } from "react-router-dom";
import { Loader2, Link as LinkIcon, Twitch, Youtube, Instagram } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { StreamerProvider, useStreamer } from "@/hooks/useStreamer";
import { StreamerThemeProvider } from "@/components/StreamerThemeProvider";
import { useLanguage } from "@/hooks/useLanguage";

function StreamerProfilePageContent() {
  const { streamer, isLoading, error } = useStreamer();
  const { t } = useLanguage();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !streamer) {
    return <Navigate to="/" replace />;
  }

  const socials = [
    streamer.twitch_url ? { label: "Twitch", href: streamer.twitch_url, icon: <Twitch className="w-4 h-4" /> } : null,
    streamer.youtube_url ? { label: "YouTube", href: streamer.youtube_url, icon: <Youtube className="w-4 h-4" /> } : null,
    streamer.instagram_url ? { label: "Instagram", href: streamer.instagram_url, icon: <Instagram className="w-4 h-4" /> } : null,
    streamer.twitter_url ? { label: "Website", href: streamer.twitter_url, icon: <LinkIcon className="w-4 h-4" /> } : null,
  ].filter(Boolean) as Array<{ label: string; href: string; icon: ReactNode }>;

  return (
    <StreamerThemeProvider streamer={streamer}>
      <div className="min-h-screen bg-background">
        <Header />

      {/* Banner */}
      {streamer.banner_url && (
        <div className="w-full h-40 md:h-56 relative overflow-hidden">
          <img src={streamer.banner_url} alt={`${streamer.display_name} banner`} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>
      )}

      <main className="px-4 pb-14">
        <section className={`${streamer.banner_url ? "pt-6" : "pt-24"}`}>
          <div className="container mx-auto max-w-3xl">
            <div className="flex flex-col md:flex-row md:items-end gap-5">
              {/* Avatar */}
              <div className="shrink-0">
                {streamer.avatar_url ? (
                  <img
                    src={streamer.avatar_url}
                    alt={streamer.display_name}
                    className="w-24 h-24 rounded-full border-4 border-background shadow-lg object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full border-4 border-background shadow-lg bg-primary/20 flex items-center justify-center">
                    <span className="text-3xl font-bold text-primary">{streamer.display_name.charAt(0).toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="flex-1">
                <h1 className="text-3xl md:text-5xl font-display font-bold leading-tight">
                  {streamer.display_name}
                </h1>
                <p className="mt-2 text-sm md:text-base text-muted-foreground">
                  {streamer.bio || streamer.welcome_message || t("hero.subtitle")}
                </p>

                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <Button asChild variant="hero" className="gap-2">
                    <a href={`/${streamer.slug}/submit`}>Submit a song</a>
                  </Button>

                  {socials.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {socials.map((s) => (
                        <Button key={s.href} variant="outline" size="sm" asChild className="gap-2">
                          <a href={s.href} target="_blank" rel="noopener noreferrer">
                            {s.icon}
                            {s.label}
                          </a>
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Optional hero text */}
            <div className="mt-10 rounded-2xl border border-border/50 bg-card/40 p-6">
              <h2 className="text-lg font-semibold">{streamer.hero_title || "Submit Your Music"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{streamer.hero_subtitle || t("hero.subtitle")}</p>
            </div>
          </div>
        </section>
      </main>

        <Footer />

        {/* Custom CSS */}
        {streamer.custom_css && <style dangerouslySetInnerHTML={{ __html: streamer.custom_css }} />}
      </div>
    </StreamerThemeProvider>
  );
}

export default function StreamerProfilePage() {
  const { slug } = useParams<{ slug: string }>();

  const reservedRoutes = ["library", "auth", "dashboard", "user", "imprint", "admin", "streamer", "profile"];
  if (!slug || reservedRoutes.includes(slug)) {
    return <Navigate to="/" replace />;
  }

  return (
    <StreamerProvider slug={slug}>
      <StreamerProfilePageContent />
    </StreamerProvider>
  );
}
