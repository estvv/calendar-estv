export const PALETTE = [
  '#0ea5e9', // sky
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#737373', // neutral
];

export const DEFAULT_COLOR = PALETTE[0];

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

// Soft tint for event backgrounds; the border/text use the full colour.
export function tint(hex: string, alpha = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
