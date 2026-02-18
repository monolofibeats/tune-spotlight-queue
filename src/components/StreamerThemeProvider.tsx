import { useEffect } from "react";
import type { Streamer } from "@/types/streamer";

// Font family map for Google Fonts
const FONT_MAP: Record<string, string> = {
  system: "Inter, system-ui, sans-serif",
  inter: '"Inter", system-ui, sans-serif',
  poppins: '"Poppins", sans-serif',
  "space-grotesk": '"Space Grotesk", sans-serif',
  playfair: '"Playfair Display", serif',
  "jetbrains-mono": '"JetBrains Mono", monospace',
};

// Google Font URLs
const FONT_URLS: Record<string, string> = {
  inter: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  poppins: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  "space-grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
  playfair: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap",
  "jetbrains-mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap",
};

interface StreamerThemeProviderProps {
  streamer: Streamer;
  children: React.ReactNode;
}

/**
 * Applies a streamer's saved design settings (colors, fonts, backgrounds, animations)
 * as CSS variables and classes on the document.
 * Also removes global theme classes to prevent overrides.
 */
export function StreamerThemeProvider({ streamer, children }: StreamerThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const cleanup: (() => void)[] = [];

    console.log("[StreamerTheme] Applying theme for:", streamer.slug, {
      primary_color: streamer.primary_color,
      accent_color: streamer.accent_color,
      button_style: streamer.button_style,
      font_family: streamer.font_family,
      animation_style: streamer.animation_style,
      card_style: streamer.card_style,
      background_type: streamer.background_type,
      background_gradient: streamer.background_gradient,
    });

    // CRITICAL: Remove global theme classes that override streamer colors
    // These classes apply gray colors when stream is "inactive" - we don't want that on streamer pages
    root.classList.remove("stream-active", "stream-inactive");
    body.classList.remove("stream-live", "stream-offline");
    
    // Mark body as having streamer theme applied
    body.dataset.streamerTheme = "active";
    cleanup.push(() => {
      delete body.dataset.streamerTheme;
    });

    // Apply primary color (HSL values like "217 91% 60%")
    if (streamer.primary_color) {
      const color = streamer.primary_color.trim();
      root.style.setProperty("--primary", color);
      root.style.setProperty("--ring", color);
      root.style.setProperty("--glow-primary", color);
      root.style.setProperty("--sidebar-primary", color);
      cleanup.push(() => {
        root.style.removeProperty("--primary");
        root.style.removeProperty("--ring");
        root.style.removeProperty("--glow-primary");
        root.style.removeProperty("--sidebar-primary");
      });
    }

    // Apply accent color
    if (streamer.accent_color) {
      const color = streamer.accent_color.trim();
      root.style.setProperty("--accent", color);
      root.style.setProperty("--glow-accent", color);
      cleanup.push(() => {
        root.style.removeProperty("--accent");
        root.style.removeProperty("--glow-accent");
      });
    }

    // Apply font family
    const fontKey = streamer.font_family || "system";
    if (fontKey !== "system" && FONT_URLS[fontKey]) {
      // Load Google Font
      const linkId = `streamer-font-${fontKey}`;
      if (!document.getElementById(linkId)) {
        const fontLink = document.createElement("link");
        fontLink.id = linkId;
        fontLink.rel = "stylesheet";
        fontLink.href = FONT_URLS[fontKey];
        document.head.appendChild(fontLink);
        cleanup.push(() => fontLink.remove());
      }
    }
    
    const fontFamily = FONT_MAP[fontKey] || FONT_MAP.system;
    body.style.fontFamily = fontFamily;
    cleanup.push(() => {
      body.style.fontFamily = "";
    });

    // Background is now rendered as a dedicated overlay div in StreamerPage
    // (no body-level background manipulation needed)

    // Apply animation style class
    if (streamer.animation_style && streamer.animation_style !== "none") {
      body.dataset.animStyle = streamer.animation_style;
      cleanup.push(() => delete body.dataset.animStyle);
    } else if (streamer.animation_style === "none") {
      body.dataset.animStyle = "none";
      cleanup.push(() => delete body.dataset.animStyle);
    }

    // Apply button style (used by CSS selectors)
    if (streamer.button_style && streamer.button_style !== "rounded") {
      body.dataset.buttonStyle = streamer.button_style;
      cleanup.push(() => delete body.dataset.buttonStyle);
    }

    // Apply card style
    if (streamer.card_style && streamer.card_style !== "glass") {
      body.dataset.cardStyle = streamer.card_style;
      cleanup.push(() => delete body.dataset.cardStyle);
    }

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [
    streamer.slug,
    streamer.primary_color,
    streamer.accent_color,
    streamer.font_family,
    streamer.background_type,
    streamer.background_gradient,
    streamer.background_image_url,
    streamer.animation_style,
    streamer.button_style,
    streamer.card_style,
  ]);

  return <>{children}</>;
}
