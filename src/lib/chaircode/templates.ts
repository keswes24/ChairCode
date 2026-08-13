import type { Zone } from "./constants";

export type StyleTemplate = {
  name: string;
  zones: Record<Zone, string>;
};

export const STYLE_TEMPLATES: StyleTemplate[] = [
  {
    name: "Textured Crop, Mid Taper",
    zones: {
      front:
        "Textured fringe worn forward with a natural part. Point-cut ends for broken texture, not blunt.",
      crown:
        "Medium length retained for texture — enough to work matte product through, no heavy layering.",
      sideburns: "Notched in with a clean line, kept at natural length, thinned slightly at the base.",
      sides:
        "Mid taper — #2 at the temple blending down to skin at the hairline. Slight disconnection from the top for contrast.",
      neckline: "Natural taper, no hard line.",
      back: "Blends into the taper, sitting just above the collar.",
      general: "Low-maintenance texture. Recommend matte clay, 6–8 week check-in.",
    },
  },
  {
    name: "Skin Fade Pompadour",
    zones: {
      front: "Long on top, swept up and back into a pompadour. Strong side part, shaved in.",
      crown: "Length preserved for volume, cut on a slight diagonal to support the roll of the pompadour.",
      sideburns: "Tapered short and blended straight into the fade — no notch.",
      sides: "Skin fade — #1 mid-shaft fading to bald by the temple.",
      neckline: "Shaved, sharp rounded neckline.",
      back: "Skin fade continues around, meeting a clean horseshoe at the crown.",
      general: "Higher-maintenance style. Pomade for hold, 3–4 week check-in to keep the fade sharp.",
    },
  },
  {
    name: "Classic Taper, All-Purpose",
    zones: {
      front: "Side part, natural fall, medium length — combable, not overly textured.",
      crown: "Even length throughout, blended with the sides, no disconnection.",
      sideburns: "Kept at natural length, blended in, no notch.",
      sides: "Classic taper — #3 on top blending to a #1 at the hairline.",
      neckline: "Natural taper, soft edge.",
      back: "Tapered to match the sides, sitting just on the collar.",
      general: "Professional, wash-and-go. Recommend a 4–6 week check-in.",
    },
  },
  {
    name: "Curly Top, Low Fade",
    zones: {
      front: "Curls left long and loose on top, worn forward and to the side, natural texture preserved.",
      crown: "Length kept for curl definition, thinned slightly to reduce bulk.",
      sideburns: "Full, blended into the fade, no hard line.",
      sides: "Low fade — #2 fading to skin just above the ear.",
      neckline: "Rounded, soft taper.",
      back: "Low fade continues around, blending in under the curls.",
      general: "Curl cream recommended for definition. 6–8 week check-in, trims only — avoid over-thinning.",
    },
  },
];
