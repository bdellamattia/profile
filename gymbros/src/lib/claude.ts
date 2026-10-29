import Anthropic from "@anthropic-ai/sdk";
import { sumItems, type Analysis, type FoodItem } from "@/lib/nutrition";

const client = new Anthropic();

const SYSTEM = `You are the nutrition coach inside GYMBROS, a calorie and protein tracker for a group of friends who lift.
You get a photo of a meal and/or a short description, and you estimate what is on the plate.

How to estimate:
- List each distinct food as an item with a realistic portion (grams or common units) and its kcal, protein, carbs and fat.
- Use visual cues for portion size: plate size, cutlery, hands, packaging. When the user gives weights or quantities, trust them over the photo.
- Account for cooking fat, sauces and dressings you can reasonably infer, since they are the usual blind spot.
- If a packaged product with a visible nutrition label is shown, use the label.
- Set confidence to "low" when portions are hard to judge or the dish is ambiguous, "high" only when quantities are clear.
- If the image is not food or drink, set is_food to false and return an empty items list.

bro_comment: one short, funny line in gym-bro voice (max 90 characters) reacting to the meal, especially its protein. Friendly, never shaming about food or body.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_food", "dish", "items", "confidence", "bro_comment"],
  properties: {
    is_food: { type: "boolean" },
    dish: { type: "string", description: "Short name of the meal, e.g. 'Chicken rice bowl'" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    bro_comment: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "portion", "kcal", "protein_g", "carbs_g", "fat_g"],
        properties: {
          name: { type: "string" },
          portion: { type: "string" },
          kcal: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
        },
      },
    },
  },
} as const;

export type AnalyzeInput = {
  image?: { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
  hint?: string;
};

export class RefusedError extends Error {}

export async function analyzeMeal({ image, hint }: AnalyzeInput): Promise<Analysis> {
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (image) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.data },
    });
  }
  content.push({
    type: "text",
    text: hint?.trim()
      ? `Details from the user: ${hint.trim()}`
      : "Estimate this meal.",
  });

  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: SCHEMA },
    },
    messages: [{ role: "user", content }],
  });

  if (response.stop_reason === "refusal") {
    throw new RefusedError("The model declined to analyze this one.");
  }

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("");
  const parsed = JSON.parse(text) as Omit<Analysis, "totals">;
  const items: FoodItem[] = parsed.items.map((i) => ({
    ...i,
    kcal: Math.max(0, i.kcal),
    protein_g: Math.max(0, i.protein_g),
    carbs_g: Math.max(0, i.carbs_g),
    fat_g: Math.max(0, i.fat_g),
  }));

  return { ...parsed, items, totals: sumItems(items) };
}
