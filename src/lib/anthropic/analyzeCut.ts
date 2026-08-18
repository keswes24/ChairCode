import Anthropic from "@anthropic-ai/sdk";
import { CONTROLLED_TAGS, GUARD_CHART, ZONES } from "@/lib/chaircode/constants";

// Verify this is still the current model name before relying on it long-term —
// per the handoff brief, do not reuse any internal/artifact-proxy-only model id.
const MODEL = "claude-sonnet-5";

// TEMP DIAGNOSTIC: check every env var this module touches for characters
// outside Latin1 (code point > 255) without ever logging the real secret
// values. Remove once the production ByteString-header bug is found.
for (const key of ["ANTHROPIC_API_KEY"] as const) {
  const value = process.env[key] ?? "";
  const badChars = [...value]
    .map((c, i) => ({ i, code: c.codePointAt(0)! }))
    .filter((c) => c.code > 255);
  console.error(
    `[env-diagnostic] ${key}: length=${value.length} badChars=${JSON.stringify(badChars)}`,
  );
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type CorrectionExample = {
  zone: string;
  before_text: string;
  after_text: string;
};

export type CutBreakdown = {
  styleName: string;
  filtered: boolean;
  zones: Record<(typeof ZONES)[number], string>;
  products: string[];
  maintenanceWeeksMin: number;
  maintenanceWeeksMax: number;
  suggestedTags: string[];
};

const guardChartText = GUARD_CHART.map(
  (g) => `#${g.guard} = ${g.inches}"`,
).join(", ");

const zoneSchema = Object.fromEntries(
  ZONES.map((z) => [
    z,
    {
      type: "string",
      description: `Breakdown text for the ${z} zone. If not visible/estimable, say so plainly rather than inventing a number.`,
    },
  ]),
);

function buildSystemPrompt(corrections: CorrectionExample[]): string {
  const fewShot =
    corrections.length > 0
      ? `\n\nRecent barber corrections — calibrate your reads against these (the AI's original guess was wrong, the barber's correction is ground truth):\n${corrections
          .map(
            (c, i) =>
              `${i + 1}. [${c.zone}] AI said: "${c.before_text}" — barber corrected to: "${c.after_text}"`,
          )
          .join("\n")}`
      : "";

  return `You are ChairCode's cut-translation assistant. A client uploads a reference photo of a haircut they want; you translate it into precise professional barbering terminology any barber can execute.

Guard chart (use these exact numbers, never invent others): ${guardChartText}.

Reasoning framework, in this order, for every zone:
1. Compare hair length in that zone to the ear height on the same head — relative comparison beats absolute guessing from a flat photo.
2. Look for visible blend/transition lines.
3. Account for curl shrinkage — curly hair looks shorter than its true length.
4. If a zone genuinely isn't visible or estimable, say so plainly. A wrong specific number is worse than an honest "not clearly visible here."

Before writing anything for a zone, decide explicitly whether it is clipper-based or scissor/length-based. Only use guard numbers where clippers are actually evidenced by the photo. Scissor-cut zones (grown-out "flow" cuts, shags, curtain fringes, etc.) should describe length and layering technique instead — never force a guard number onto a scissor-cut zone.

Tags: choose 1-4 tags from this exact controlled vocabulary only, never invent new tag strings: ${CONTROLLED_TAGS.join(", ")}.

Set "filtered" to true if the reference photo looks heavily edited or professionally styled/lit in a way that may not reflect a realistic in-person result.${fewShot}`;
}

export type CutRefreshBreakdown = {
  overallNotes: string;
  zones: Record<(typeof ZONES)[number], string>;
};

function buildRefreshSystemPrompt(
  originalZones: Record<string, string>,
  weeksElapsed: number,
  corrections: CorrectionExample[],
): string {
  const fewShot =
    corrections.length > 0
      ? `\n\nRecent barber corrections — calibrate your reads against these (the AI's original guess was wrong, the barber's correction is ground truth):\n${corrections
          .map(
            (c, i) =>
              `${i + 1}. [${c.zone}] AI said: "${c.before_text}" — barber corrected to: "${c.after_text}"`,
          )
          .join("\n")}`
      : "";

  const lastTimeText = ZONES.map((z) => `- ${z}: ${originalZones[z]}`).join("\n");

  return `You are ChairCode's cut-refresh assistant. A client is back in the chair for a touch-up. Your job is NOT to design a new style — it's to tell the barber exactly what to do THIS visit to restore the style they already have, based on regrowth since last time.

Guard chart (use these exact numbers, never invent others): ${guardChartText}.

What was done last time, zone by zone (this is the target style to restore):
${lastTimeText}

It has been approximately ${weeksElapsed} week(s) since that cut.

For every zone, reason in this order:
1. Look at the new photo and judge the ACTUAL visible regrowth in that zone — real visual evidence beats a growth-rate formula. Average hair growth is roughly 1/4" per 4 weeks, but curl pattern, hair type, and zone all vary — use ${weeksElapsed} week(s) only as a rough sanity check against what you actually see.
2. State what guard/technique was used last time (from the list above) and what to use THIS time to bring it back to the same target — usually the same guard, unless visible regrowth clearly calls for stepping down a size, or the zone was scissor/length-based, in which case describe how much length to remove.
3. If a zone looks like it's barely grown or the photo doesn't show it clearly, say so plainly rather than inventing a change.
4. Flag if the client appears to be intentionally growing something out (e.g. sides noticeably longer than a simple maintenance regrowth would explain) — note it as a question to confirm in person rather than assuming.

Write each zone's text as direct, actionable instruction to the barber (e.g. "Sides were #2 last time; regrowth is minimal — stay at #2." or "Sides were #1 eight weeks ago; grown out further than expected for the interval — confirm with client whether to maintain tight at #1 or ease up to #1.5.").

Also write one or two sentences of overall notes summarizing the visit (e.g. anything notable about how evenly it grew out, or if the whole cut looks like it's ready to be redone from scratch instead of just refreshed).${fewShot}`;
}

export async function analyzeCutRefresh(params: {
  imageBase64: string;
  imageMediaType: "image/jpeg" | "image/png" | "image/webp";
  originalZones: Record<string, string>;
  weeksElapsed: number;
  corrections: CorrectionExample[];
}): Promise<CutRefreshBreakdown> {
  const { imageBase64, imageMediaType, originalZones, weeksElapsed, corrections } = params;

  const userContent: Anthropic.MessageParam["content"] = [
    {
      type: "image",
      source: { type: "base64", media_type: imageMediaType, data: imageBase64 },
    },
    {
      type: "text",
      text: "This is today's photo of the client's current hair, in the chair. Produce refresh guidance for each zone.",
    },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: buildRefreshSystemPrompt(originalZones, weeksElapsed, corrections),
    messages: [{ role: "user", content: userContent }],
    tools: [
      {
        name: "submit_refresh_breakdown",
        description: "Submit the structured zone-by-zone refresh guidance for today's touch-up.",
        input_schema: {
          type: "object",
          properties: {
            overallNotes: { type: "string" },
            zones: {
              type: "object",
              properties: zoneSchema,
              required: [...ZONES],
            },
          },
          required: ["overallNotes", "zones"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_refresh_breakdown" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a structured refresh breakdown.");
  }

  return toolUse.input as CutRefreshBreakdown;
}

export async function analyzeCutPhoto(params: {
  imageBase64: string;
  imageMediaType: "image/jpeg" | "image/png" | "image/webp";
  freeTextDescription?: string;
  corrections: CorrectionExample[];
}): Promise<CutBreakdown> {
  const { imageBase64, imageMediaType, freeTextDescription, corrections } =
    params;

  const userContent: Anthropic.MessageParam["content"] = [
    {
      type: "image",
      source: {
        type: "base64",
        media_type: imageMediaType,
        data: imageBase64,
      },
    },
    {
      type: "text",
      text: freeTextDescription
        ? `Client's own description, use as extra context: "${freeTextDescription}"`
        : "Analyze this reference photo and produce the full zone-by-zone breakdown.",
    },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: buildSystemPrompt(corrections),
    messages: [{ role: "user", content: userContent }],
    tools: [
      {
        name: "submit_cut_breakdown",
        description:
          "Submit the structured zone-by-zone cut breakdown for this reference photo.",
        input_schema: {
          type: "object",
          properties: {
            styleName: {
              type: "string",
              description: "Short descriptive name for the overall style.",
            },
            filtered: { type: "boolean" },
            zones: {
              type: "object",
              properties: zoneSchema,
              required: [...ZONES],
            },
            products: {
              type: "array",
              items: { type: "string" },
              description: "Haircare products relevant to maintaining this style.",
            },
            maintenanceWeeksMin: { type: "number" },
            maintenanceWeeksMax: { type: "number" },
            suggestedTags: {
              type: "array",
              items: { type: "string", enum: [...CONTROLLED_TAGS] },
              minItems: 1,
              maxItems: 4,
            },
          },
          required: [
            "styleName",
            "filtered",
            "zones",
            "products",
            "maintenanceWeeksMin",
            "maintenanceWeeksMax",
            "suggestedTags",
          ],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_cut_breakdown" },
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Model did not return a structured breakdown.");
  }

  const raw = toolUse.input as CutBreakdown;

  // Server-side validation: never trust the model's tag choices blindly.
  const validTags = new Set<string>(CONTROLLED_TAGS);
  const suggestedTags = raw.suggestedTags.filter((t) => validTags.has(t));

  return { ...raw, suggestedTags };
}
