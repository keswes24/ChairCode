import Anthropic from "@anthropic-ai/sdk";
import { CONTROLLED_TAGS, GUARD_CHART, ZONES } from "@/lib/chaircode/constants";

// Verify this is still the current model name before relying on it long-term —
// per the handoff brief, do not reuse any internal/artifact-proxy-only model id.
const MODEL = "claude-sonnet-5";

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
