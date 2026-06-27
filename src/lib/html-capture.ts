import html2canvas from "html2canvas-pro";

const LIGHT_SHELL_VARS = `
[data-theme="light"] {
  --background: #eef2f7;
  --foreground: #0f172a;
  --shell-bg: #eef2f7;
  --shell-surface: #f8fafc;
  --shell-card: #ffffff;
  --shell-border: #cbd5e1;
  --shell-text: #0f172a;
  --shell-text-muted: #475569;
  --shell-hover: #e2e8f0;
}
`;

export type CaptureOptions = {
  scale?: number;
  backgroundColor?: string;
  theme?: "light" | "dark";
};

/**
 * Capture DOM → canvas.
 * Conserve les classes Tailwind / CSS du document (pas d'inlining destructif).
 */
export async function captureElementToCanvas(
  element: HTMLElement,
  options?: CaptureOptions
): Promise<HTMLCanvasElement> {
  const scale = options?.scale ?? 2;
  const theme = options?.theme ?? "dark";
  const backgroundColor =
    options?.backgroundColor ?? (theme === "light" ? "#eef2f7" : "#070b14");

  const rect = element.getBoundingClientRect();

  const host = document.createElement("div");
  host.setAttribute("data-theme", theme);
  host.style.cssText =
    "position:fixed;left:-100000px;top:0;z-index:-1;pointer-events:none;overflow:visible;";

  if (theme === "light") {
    const styleEl = document.createElement("style");
    styleEl.textContent = LIGHT_SHELL_VARS;
    host.appendChild(styleEl);
  }

  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.width = `${rect.width}px`;
  clone.style.height = "auto";
  clone.style.minHeight = "0";
  clone.style.maxHeight = "none";
  clone.style.display = "block";
  clone.style.overflow = "visible";

  const scrollArea = clone.querySelector(":scope > div:nth-child(2)");
  if (scrollArea instanceof HTMLElement) {
    scrollArea.style.flex = "none";
    scrollArea.style.overflow = "visible";
    scrollArea.style.height = "auto";
  }
  const footer = clone.querySelector("footer");
  if (footer instanceof HTMLElement) {
    footer.style.marginTop = "0";
  }

  host.appendChild(clone);
  document.body.appendChild(host);

  const captureWidth = Math.ceil(rect.width);
  const captureHeight = Math.ceil(clone.scrollHeight || rect.height);

  try {
    return await html2canvas(clone, {
      scale,
      useCORS: true,
      backgroundColor,
      logging: false,
      width: captureWidth,
      height: captureHeight,
    });
  } finally {
    document.body.removeChild(host);
  }
}
