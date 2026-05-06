"use client";

import { useEffect, useState, type RefObject } from "react";

export type RgbaColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

export type RibbonChrome = {
  backgroundImage: string;
  borderColor: string;
  boxShadow: string;
};

const DEFAULT_CANVAS: RgbaColor = { r: 2, g: 6, b: 23, a: 1 };
const DARK_ANCHOR: RgbaColor = { r: 2, g: 6, b: 23, a: 1 };
const DARK_ANCHOR_2: RgbaColor = { r: 15, g: 23, b: 42, a: 1 };
const LIGHT_ANCHOR: RgbaColor = { r: 255, g: 255, b: 255, a: 1 };
let colorParserNode: HTMLSpanElement | null = null;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toChannel(value: number): number {
  return Math.round(clamp(value, 0, 255));
}

function srgbToLinear(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(color: Pick<RgbaColor, "r" | "g" | "b">): number {
  return (
    0.2126 * srgbToLinear(color.r) +
    0.7152 * srgbToLinear(color.g) +
    0.0722 * srgbToLinear(color.b)
  );
}

export function rgbaToCss(color: RgbaColor, alpha = color.a): string {
  return `rgba(${toChannel(color.r)}, ${toChannel(color.g)}, ${toChannel(color.b)}, ${clamp(alpha, 0, 1)})`;
}

export function mixColors(
  first: Pick<RgbaColor, "r" | "g" | "b">,
  second: Pick<RgbaColor, "r" | "g" | "b">,
  firstWeight: number,
): RgbaColor {
  const weight = clamp(firstWeight, 0, 1);
  const complement = 1 - weight;
  return {
    r: toChannel(first.r * weight + second.r * complement),
    g: toChannel(first.g * weight + second.g * complement),
    b: toChannel(first.b * weight + second.b * complement),
    a: 1,
  };
}

export function compositeColors(
  foreground: RgbaColor,
  background: RgbaColor,
): RgbaColor {
  const alpha = clamp(foreground.a, 0, 1);
  const inverse = 1 - alpha;
  return {
    r: toChannel(foreground.r * alpha + background.r * inverse),
    g: toChannel(foreground.g * alpha + background.g * inverse),
    b: toChannel(foreground.b * alpha + background.b * inverse),
    a: clamp(alpha + background.a * inverse, 0, 1),
  };
}

export function parseCssColor(input: string | null | undefined): RgbaColor | null {
  if (!input) {
    return null;
  }

  const value = input.trim().toLowerCase();
  if (!value || value === "transparent") {
    return null;
  }

  const hex = value.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const raw = hex[1] ?? "";
    if (!raw) {
      return null;
    }
    if (raw.length === 3) {
      return {
        r: parseInt(raw.charAt(0) + raw.charAt(0), 16),
        g: parseInt(raw.charAt(1) + raw.charAt(1), 16),
        b: parseInt(raw.charAt(2) + raw.charAt(2), 16),
        a: 1,
      };
    }
    if (raw.length === 4) {
      return {
        r: parseInt(raw.charAt(0) + raw.charAt(0), 16),
        g: parseInt(raw.charAt(1) + raw.charAt(1), 16),
        b: parseInt(raw.charAt(2) + raw.charAt(2), 16),
        a: parseInt(raw.charAt(3) + raw.charAt(3), 16) / 255,
      };
    }
    if (raw.length === 6 || raw.length === 8) {
      return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
        a: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  const rgb = value.match(
    /^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*[,/]\s*([0-9.]+))?\s*\)$/,
  );
  if (rgb) {
    return {
      r: Number(rgb[1]),
      g: Number(rgb[2]),
      b: Number(rgb[3]),
      a: rgb[4] === undefined ? 1 : Number(rgb[4]),
    };
  }

  return null;
}

function averageColors(colors: RgbaColor[]): RgbaColor {
  if (colors.length === 0) {
    return DEFAULT_CANVAS;
  }

  const total = colors.reduce(
    (acc, color) => {
      acc.r += color.r;
      acc.g += color.g;
      acc.b += color.b;
      acc.a += color.a;
      return acc;
    },
    { r: 0, g: 0, b: 0, a: 0 },
  );

  return {
    r: toChannel(total.r / colors.length),
    g: toChannel(total.g / colors.length),
    b: toChannel(total.b / colors.length),
    a: clamp(total.a / colors.length, 0, 1),
  };
}

function normalizeCssColorToken(token: string): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  if (!colorParserNode) {
    colorParserNode = document.createElement("span");
    colorParserNode.setAttribute("aria-hidden", "true");
    colorParserNode.style.position = "absolute";
    colorParserNode.style.left = "-9999px";
    colorParserNode.style.top = "-9999px";
    colorParserNode.style.visibility = "hidden";
    document.body.appendChild(colorParserNode);
  }

  colorParserNode.style.color = "";
  colorParserNode.style.color = token;
  if (!colorParserNode.style.color) {
    return null;
  }

  return window.getComputedStyle(colorParserNode).color;
}

function resolveCanvasBackgroundColor(): RgbaColor {
  if (typeof window === "undefined") {
    return DEFAULT_CANVAS;
  }

  const rootComputed = window.getComputedStyle(document.documentElement);
  const bodyComputed = window.getComputedStyle(document.body);
  return (
    parseCssColor(rootComputed.getPropertyValue("--bg-canvas")) ??
    parseCssColor(bodyComputed.backgroundColor) ??
    parseCssColor(rootComputed.backgroundColor) ??
    DEFAULT_CANVAS
  );
}

function resolveElementBackdropColor(element: Element | null): RgbaColor | null {
  if (!element || typeof window === "undefined") {
    return null;
  }

  const computed = window.getComputedStyle(element);
  const gradientColors = computed.backgroundImage !== "none"
    ? computed.backgroundImage.match(
        /(?:rgba?\([^)]+\)|lab\([^)]+\)|lch\([^)]+\)|oklab\([^)]+\)|oklch\([^)]+\)|#[0-9a-f]{3,8})/gi,
      )
    : null;
  const gradientColor = gradientColors?.map((token) => normalizeCssColorToken(token) ?? token).map((token) => parseCssColor(token)).filter(
    (color): color is RgbaColor => Boolean(color),
  );
  const color = parseCssColor(computed.backgroundColor);
  const paintedImageColor =
    gradientColor && gradientColor.length > 0 ? averageColors(gradientColor) : null;

  if (paintedImageColor && color) {
    const merged = compositeColors(paintedImageColor, color);
    if (merged.a >= 0.995) {
      return merged;
    }

    const parentColor = resolveElementBackdropColor(element.parentElement);
    return parentColor ? compositeColors(merged, parentColor) : merged;
  }

  if (paintedImageColor) {
    if (paintedImageColor.a >= 0.995) {
      return paintedImageColor;
    }

    const parentColor = resolveElementBackdropColor(element.parentElement);
    return parentColor
      ? compositeColors(paintedImageColor, parentColor)
      : paintedImageColor;
  }

  if (color && color.a >= 0.995) {
    return color;
  }

  const parentColor = resolveElementBackdropColor(element.parentElement);
  if (!color) {
    return parentColor;
  }

  if (!parentColor) {
    return color.a > 0 ? color : null;
  }

  return compositeColors(color, parentColor);
}

function resolveBackdropColorAtPoint(
  ribbonElement: HTMLElement,
  x: number,
  y: number,
): RgbaColor {
  if (typeof document === "undefined") {
    return DEFAULT_CANVAS;
  }

  const elements = document.elementsFromPoint(x, y);
  for (const element of elements) {
    if (!(element instanceof HTMLElement)) {
      continue;
    }

    if (ribbonElement.contains(element)) {
      continue;
    }

    const color = resolveElementBackdropColor(element);
    if (color) {
      return color;
    }
  }

  return resolveCanvasBackgroundColor();
}

function sampleRibbonBackdropColor(ribbonElement: HTMLElement): RgbaColor {
  const rect = ribbonElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return resolveCanvasBackgroundColor();
  }

  const sampleY = clamp(rect.bottom + 12, 0, Math.max(0, window.innerHeight - 2));
  const sampleXs = [0.2, 0.5, 0.8]
    .map((ratio) => rect.left + rect.width * ratio)
    .filter((x) => x >= 0 && x <= Math.max(0, window.innerWidth - 1));

  const colors = sampleXs
    .map((x) => resolveBackdropColorAtPoint(ribbonElement, x, sampleY))
    .filter(Boolean);

  return colors.length > 0 ? averageColors(colors) : resolveCanvasBackgroundColor();
}

export function buildRibbonChrome(baseColor: RgbaColor): RibbonChrome {
  const luminance = relativeLuminance(baseColor);
  const isLightBackdrop = luminance > 0.45;
  const firstWeight = isLightBackdrop ? 0.22 : 0.3;
  const secondWeight = isLightBackdrop ? 0.16 : 0.24;
  const thirdWeight = isLightBackdrop ? 0.1 : 0.18;

  const primary = mixColors(baseColor, DARK_ANCHOR, firstWeight);
  const secondary = mixColors(baseColor, DARK_ANCHOR_2, secondWeight);
  const highlight = mixColors(baseColor, LIGHT_ANCHOR, thirdWeight);
  const border = mixColors(baseColor, LIGHT_ANCHOR, isLightBackdrop ? 0.14 : 0.08);
  const shadowAlpha = isLightBackdrop ? 0.66 : 0.54;

  return {
    backgroundImage: `linear-gradient(135deg, ${rgbaToCss(primary, 0.9)} 0%, ${rgbaToCss(secondary, 0.94)} 50%, ${rgbaToCss(highlight, 0.78)} 100%)`,
    borderColor: rgbaToCss(border, isLightBackdrop ? 0.3 : 0.2),
    boxShadow: `0 48px 96px -24px rgba(2, 6, 23, ${shadowAlpha}), 0 18px 34px -26px ${rgbaToCss(baseColor, isLightBackdrop ? 0.18 : 0.12)}`,
  };
}

export function useAdaptiveRibbonChrome(
  ribbonRef: RefObject<HTMLElement | null>,
  dependencyKey: string,
): RibbonChrome {
  const [chrome, setChrome] = useState<RibbonChrome>(() =>
    buildRibbonChrome(resolveCanvasBackgroundColor()),
  );

  useEffect(() => {
    const ribbonElement = ribbonRef.current;
    if (!ribbonElement || typeof window === "undefined") {
      return;
    }

    let animationFrameId: number | null = null;

    const updateChrome = () => {
      animationFrameId = null;
      const nextChrome = buildRibbonChrome(sampleRibbonBackdropColor(ribbonElement));
      setChrome((current) =>
        current.backgroundImage === nextChrome.backgroundImage &&
        current.borderColor === nextChrome.borderColor &&
        current.boxShadow === nextChrome.boxShadow
          ? current
          : nextChrome,
      );
    };

    const scheduleUpdate = () => {
      if (animationFrameId !== null) {
        return;
      }
      animationFrameId = window.requestAnimationFrame(updateChrome);
    };

    scheduleUpdate();

    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    const observers: ResizeObserver[] = [];
    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(scheduleUpdate);
      resizeObserver.observe(document.documentElement);
      resizeObserver.observe(document.body);
      resizeObserver.observe(ribbonElement);
      observers.push(resizeObserver);
    }

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [dependencyKey, ribbonRef]);

  return chrome;
}
