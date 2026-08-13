import type { Zone } from "./constants";

export type Question = {
  id: string;
  zone: Zone;
  text: string;
  type: "single" | "multi";
  options: string[];
};

export const QUESTIONS: Question[] = [
  {
    id: "front_lay",
    zone: "front",
    text: "Where do you like the front to lay?",
    type: "single",
    options: ["Up and over", "Pushed left", "Pushed right", "Backward", "Forward"],
  },
  {
    id: "front_part",
    zone: "front",
    text: "Part preference?",
    type: "single",
    options: ["Shaved in", "Natural", "No part"],
  },
  {
    id: "crown_growth",
    zone: "crown",
    text: "Any growth patterns or spots that stick up?",
    type: "single",
    options: ["No", "Yes — crown swirl", "Yes — front cowlick"],
  },
  {
    id: "sideburn_style",
    zone: "sideburns",
    text: "Notched in with a clear line, or blended?",
    type: "single",
    options: ["Notched", "Blended", "No preference"],
  },
  {
    id: "sideburn_bulk",
    zone: "sideburns",
    text: "Preference on bulk?",
    type: "single",
    options: ["Thinned", "Full", "No preference"],
  },
  {
    id: "sides_connect",
    zone: "sides",
    text: "Blended into the top, or disconnected?",
    type: "single",
    options: ["Blended", "Disconnected (undercut)", "Not sure"],
  },
  {
    id: "sides_ear",
    zone: "sides",
    text: "How far off the ears?",
    type: "single",
    options: ["Cut back", "Just touching", "Covering"],
  },
  {
    id: "neckline_shape",
    zone: "neckline",
    text: "Neckline shape?",
    type: "single",
    options: ["Square", "Rounded", "Natural", "Drop taper"],
  },
  {
    id: "back_length",
    zone: "back",
    text: "Sitting on the collar, or shorter?",
    type: "single",
    options: ["On the collar", "Shorter", "Much shorter"],
  },
  {
    id: "general_spots",
    zone: "general",
    text: "Any moles or spots to be careful around?",
    type: "multi",
    options: ["None", "Yes — noted in photo", "Will point out in person"],
  },
  {
    id: "general_bother",
    zone: "general",
    text: "Anything that bothered you about your last cut?",
    type: "multi",
    options: ["Too short overall", "Uneven sides", "Grew out too fast", "Nothing — it was great"],
  },
  {
    id: "general_frequency",
    zone: "general",
    text: "How often do you typically get cut?",
    type: "single",
    options: ["Every 2–3 weeks", "Every 4–6 weeks", "Every 8+ weeks", "First time in a while"],
  },
];

export const FOLDER_NAMES = [
  "Current",
  "Past liked",
  "Longer",
  "Seasonal",
  "Favorites",
  "Beard",
] as const;
