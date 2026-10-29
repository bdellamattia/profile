import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { analyzeMeal, RefusedError, type AnalyzeInput } from "@/lib/claude";
import { DAILY_AI_LIMIT } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 60;

const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_IMAGE_CHARS = 7_000_000; // ~5 MB of base64

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return NextResponse.json({ error: "Sign in first, bro." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    image?: string;
    mediaType?: string;
    hint?: string;
  } | null;

  const hint = body?.hint?.slice(0, 500);
  let image: AnalyzeInput["image"];
  if (body?.image) {
    const mediaType = MEDIA_TYPES.find((t) => t === body.mediaType);
    if (!mediaType || body.image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: "That photo is not usable. Try a JPEG." }, { status: 400 });
    }
    image = { data: body.image, mediaType };
  }
  if (!image && !hint?.trim()) {
    return NextResponse.json({ error: "Snap a photo or describe what you ate." }, { status: 400 });
  }

  // Daily cap per user, so a shared link can't run up the API bill.
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("analysis_log")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_AI_LIMIT) {
    return NextResponse.json(
      { error: `Daily scan limit hit (${DAILY_AI_LIMIT}). Log it by hand or come back tomorrow.` },
      { status: 429 },
    );
  }
  await supabase.from("analysis_log").insert({});

  try {
    const analysis = await analyzeMeal({ image, hint });
    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof RefusedError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Too many scans right now, retry in a minute." }, { status: 503 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Claude API error", error.status, error.message);
      return NextResponse.json({ error: "The food scanner is down. Try again." }, { status: 502 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not read that meal. Try again." }, { status: 500 });
  }
}
