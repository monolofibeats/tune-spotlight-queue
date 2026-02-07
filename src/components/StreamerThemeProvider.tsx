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
      button_style: streamer.button_style,
      font_family: streamer.font_family,
      animation_style: streamer.animation_style,
      card_style: streamer.card_style,
      background_type: streamer.background_type,
    });

    // CRITICAL: Remove global theme classes that override streamer colors
    root.classList.remove("stream-active", "stream-inactive");
    cleanup.push(() => {
      // Don't restore - let ThemeWrapper handle it when navigating away
    });

    // Apply primary color (HSL values like "217 91% 60%")
    if (streamer.primary_color) {
      root.style.setProperty("--primary", streamer.primary_color);
      root.style.setProperty("--ring", streamer.primary_color);
      root.style.setProperty("--glow-primary", streamer.primary_color);
      cleanup.push(() => {
        root.style.removeProperty("--primary");
        root.style.removeProperty("--ring");
        root.style.removeProperty("--glow-primary");
      });
    }

    // Apply accent color
    if (streamer.accent_color) {
      root.style.setProperty("--accent", streamer.accent_color);
      root.style.setProperty("--glow-accent", streamer.accent_color);
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

    // Apply background style
    if (streamer.background_type === "gradient" && streamer.background_gradient) {
      body.style.background = streamer.background_gradient;
      cleanup.push(() => {
        body.style.background = "";
      });
    } else if (streamer.background_type === "image" && streamer.background_image_url) {
      body.style.backgroundImage = `url(${streamer.background_image_url})`;
      body.style.backgroundSize = "cover";
      body.style.backgroundPosition = "center";
      body.style.backgroundAttachment = "fixed";
      cleanup.push(() => {
        body.style.backgroundImage = "";
        body.style.backgroundSize = "";
        body.style.backgroundPosition = "";
        body.style.backgroundAttachment = "";
      });
    }

    // Apply animation style class
    if (streamer.animation_style && streamer.animation_style !== "none") {
      body.dataset.animStyle = streamer.animation_style;
      cleanup.push(() => delete body.dataset.animStyle);
    }

    // Apply button style (used by CSS selectors)
    if (streamer.button_style && streamer.button_style !== "default") {
      body.dataset.buttonStyle = streamer.button_style;
      cleanup.push(() => delete body.dataset.buttonStyle);
    }

    // Apply card style
    if (streamer.card_style && streamer.card_style !== "default") {
      body.dataset.cardStyle = streamer.card_style;
      cleanup.push(() => delete body.dataset.cardStyle);
    }

    return () => {
      cleanup.forEach((fn) => fn());
    };
  }, [
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
