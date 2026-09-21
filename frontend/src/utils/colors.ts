export const PALETTE = [
  '#00a7f5', // sky
  '#2b2f6b', // navy
  '#8b3fe0', // purple
  '#e5007e', // pink
  '#ff5a36', // coral
  '#ff9f1c', // orange
  '#9dc23a', // lime
  '#1cc7a8', // teal
  '#7a7a7a', // grey
];

export const DEFAULT_COLOR = PALETTE[0];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// Soft tint for event backgrounds; the border/text use the full colour.
export function tint(hex: string, alpha = 0.09): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
