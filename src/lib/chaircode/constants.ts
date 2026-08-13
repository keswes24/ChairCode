export const ZONES = [
  "front",
  "crown",
  "sideburns",
  "sides",
  "neckline",
  "back",
  "general",
] as const;

export type Zone = (typeof ZONES)[number];

export const GUARD_CHART = [
  { guard: "0 / skin", inches: "0" },
  { guard: "0.5", inches: "1/16" },
  { guard: "1", inches: "1/8 (3mm)" },
  { guard: "1.5", inches: "3/16" },
  { guard: "2", inches: "1/4 (6mm)" },
  { guard: "3", inches: "3/8 (10mm)" },
  { guard: "4", inches: "1/2 (13mm)" },
  { guard: "5", inches: "5/8 (16mm)" },
  { guard: "6", inches: "3/4 (19mm)" },
  { guard: "7", inches: "7/8 (22mm)" },
  { guard: "8", inches: "1 (25mm)" },
] as const;

export const CONTROLLED_TAGS = [
  "Fade",
  "Skin Fade",
  "Taper",
  "Textured",
  "Pompadour",
  "Undercut",
  "Curly",
  "Classic",
  "Beard",
  "Flow",
  "Scissor Cut",
] as const;

export type ControlledTag = (typeof CONTROLLED_TAGS)[number];

// Checkout code: 5 chars, excludes ambiguous O/0/I/1.
const CHECKOUT_CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generateCheckoutCode(): string {
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += CHECKOUT_CODE_ALPHABET[
      Math.floor(Math.random() * CHECKOUT_CODE_ALPHABET.length)
    ];
  }
  return `CC-${code}`;
}
