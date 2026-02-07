import { useEffect } from "react";
import type { Streamer } from "@/types/streamer";

interface StreamerThemeProviderProps {
  streamer: Streamer;
  children: React.ReactNode;
}

/**
 * Applies a streamer's saved design settings (colors, fonts, backgrounds, animations)
 * as CSS variables and classes on the document.
 */
export function StreamerThemeProvider({ streamer, children }: StreamerThemeProviderProps) {
  useEffect(() => {
    const root = document.documentElement;
    const cleanup: (() => void)[] = [];

    // Apply primary color
    if (streamer.primary_color) {
      root.style.setProperty("--streamer-primary", streamer.primary_color);
      root.style.setProperty("--primary", streamer.primary_color);
      cleanup.push(() => {
        root.style.removeProperty("--streamer-primary");
        root.style.removeProperty("--primary");
      });
    }

    // Apply accent color
    if (streamer.accent_color) {
      root.style.setProperty("--accent", streamer.accent_color);
      cleanup.push(() => root.style.removeProperty("--accent"));
    }

    // Apply font family
    if (streamer.font_family && streamer.font_family !== "default") {
      // Load Google Font
      const fontLink = document.createElement("link");
      fontLink.rel = "stylesheet";
      fontLink.href = `https://fonts.googleapis.com/css2?family=${streamer.font_family.replace(/ /g, "+")}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(fontLink);

      root.style.setProperty("--font-display", `"${streamer.font_family}", sans-serif`);
      root.style.setProperty("--font-body", `"${streamer.font_family}", sans-serif`);
      cleanup.push(() => {
        fontLink.remove();
        root.style.removeProperty("--font-display");
        root.style.removeProperty("--font-body");
      });
    }

    // Apply background style
    if (streamer.background_type === "gradient" && streamer.background_gradient) {
      root.style.setProperty("--streamer-bg", streamer.background_gradient);
      document.body.style.background = streamer.background_gradient;
      cleanup.push(() => {
        root.style.removeProperty("--streamer-bg");
        document.body.style.background = "";
      });
    } else if (streamer.background_type === "image" && streamer.background_image_url) {
      document.body.style.backgroundImage = `url(${streamer.background_image_url})`;
      document.body.style.backgroundSize = "cover";
      document.body.style.backgroundPosition = "center";
      document.body.style.backgroundAttachment = "fixed";
      cleanup.push(() => {
        document.body.style.backgroundImage = "";
        document.body.style.backgroundSize = "";
        document.body.style.backgroundPosition = "";
        document.body.style.backgroundAttachment = "";
      });
    }

    // Apply animation style class
    if (streamer.animation_style && streamer.animation_style !== "none") {
      document.body.classList.add(`anim-${streamer.animation_style}`);
      cleanup.push(() => document.body.classList.remove(`anim-${streamer.animation_style}`));
    }

    // Apply button style class
    if (streamer.button_style && streamer.button_style !== "default") {
      document.body.dataset.buttonStyle = streamer.button_style;
      cleanup.push(() => delete document.body.dataset.buttonStyle);
    }

    // Apply card style class
    if (streamer.card_style && streamer.card_style !== "default") {
      document.body.dataset.cardStyle = streamer.card_style;
      cleanup.push(() => delete document.body.dataset.cardStyle);
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
