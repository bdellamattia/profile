"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { localDay, round1, sumItems, type Analysis } from "@/lib/nutrition";
import { blobToBase64, prepareImage } from "@/lib/image";
import { createClient } from "@/lib/supabase/client";

const PORTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const LOADING_LINES = [
  "Counting the gainz...",
  "Weighing that chicken with my eyes...",
  "Asking the protein gods...",
  "Spotting hidden olive oil...",
];

const MANUAL: Analysis = {
  is_food: true,
  dish: "",
  items: [],
  confidence: "high",
  bro_comment: "Old school logging. Respect.",
  totals: { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
};

export function SnapScreen() {
  const router = useRouter();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState<"analyze" | "save" | null>(null);
  const [line, setLine] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [name, setName] = useState("");
  const [mult, setMult] = useState(1);
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");

  useEffect(() => {
    if (busy !== "analyze") return;
    const t = setInterval(() => setLine((l) => (l + 1) % LOADING_LINES.length), 1800);
    return () => clearInterval(t);
  }, [busy]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  async function onFile(file?: File) {
    if (!file) return;
    setError(null);
    try {
      const blob = await prepareImage(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      setError("Couldn't read that photo. Try another one.");
    }
  }

  function applyAnalysis(a: Analysis, m = 1) {
    setAnalysis(a);
    setName(a.dish);
    setMult(m);
    setKcal(String(Math.round(a.totals.kcal * m)));
    setProtein(String(round1(a.totals.protein_g * m)));
  }

  async function analyze() {
    setBusy("analyze");
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: photo ? await blobToBase64(photo) : undefined,
          mediaType: photo ? "image/jpeg" : undefined,
          hint,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      if (!data.is_food) {
        setError("That doesn't look like food, bro. 🤔");
        return;
      }
      applyAnalysis(data as Analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(null);
    }
  }

  function pickPortion(m: number) {
    if (!analysis) return;
    applyAnalysis(analysis, m);
  }

  async function save() {
    if (!analysis) return;
    const kcalN = Math.max(0, Math.round(Number(kcal) || 0));
    const proteinN = Math.max(0, round1(Number(protein) || 0));
    if (!name.trim()) return setError("Give this meal a name.");

    setBusy("save");
    setError(null);
    const supabase = createClient();
    try {
      const { data: claims } = await supabase.auth.getClaims();
      const uid = claims?.claims.sub;
      if (!uid) throw new Error("Session expired, sign in again.");

      let photo_path: string | null = null;
      if (photo) {
        photo_path = `${uid}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("meal-photos")
          .upload(photo_path, photo, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
      }

      const items = analysis.items.map((i) => ({
        ...i,
        kcal: Math.round(i.kcal * mult),
        protein_g: round1(i.protein_g * mult),
        carbs_g: round1(i.carbs_g * mult),
        fat_g: round1(i.fat_g * mult),
      }));
      const macros = sumItems(items);

      const { error: insErr } = await supabase.from("meals").insert({
        day: localDay(),
        name: name.trim().slice(0, 80),
        items,
        kcal: kcalN,
        protein_g: proteinN,
        carbs_g: macros.carbs_g,
        fat_g: macros.fat_g,
        confidence: analysis.confidence,
        photo_path,
      });
      if (insErr) throw insErr;
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setBusy(null);
    }
  }

  // Review step ---------------------------------------------------------------
  if (analysis) {
    return (
      <>
        <header className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-3xl uppercase">Check it</h1>
          <button className="text-sm text-muted" onClick={() => setAnalysis(null)}>
            ← Redo
          </button>
        </header>

        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="mb-4 aspect-[4/3] w-full rounded-3xl object-cover" />
        )}

        <div className="card mb-4 p-4">
          <p className="mb-3 text-lg animate-pop">“{analysis.bro_comment}”</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Meal name"
            className="input mb-3 font-semibold"
          />
          {analysis.items.length > 0 && (
            <>
              <ul className="mb-3 divide-y divide-line text-sm">
                {analysis.items.map((i, idx) => (
                  <li key={idx} className="flex justify-between gap-3 py-2">
                    <span>
                      {i.name} <span className="text-muted">· {i.portion}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted">
                      {Math.round(i.kcal * mult)} kcal · {round1(i.protein_g * mult)} g
                    </span>
                  </li>
                ))}
              </ul>
              <span
                className={`inline-block rounded-full px-3 py-1 text-xs font-display uppercase ${
                  analysis.confidence === "low"
                    ? "bg-pink/15 text-pink"
                    : analysis.confidence === "medium"
                      ? "bg-sky/15 text-sky"
                      : "bg-lime/15 text-lime"
                }`}
              >
                {analysis.confidence} confidence
              </span>
              {analysis.confidence === "low" && (
                <p className="mt-2 text-xs text-muted">Rough guess. Adjust the portion or fix the numbers below.</p>
              )}
            </>
          )}
        </div>

        {analysis.items.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 font-display text-xs uppercase text-muted">How much did you actually eat?</p>
            <div className="grid grid-cols-6 gap-1.5">
              {PORTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => pickPortion(p)}
                  className={`rounded-xl py-2.5 text-sm font-display ${
                    mult === p ? "bg-lime text-black" : "border border-line bg-panel text-muted"
                  }`}
                >
                  x{p}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 gap-3">
          <label className="card p-4">
            <span className="font-display text-xs uppercase text-lime">Calories</span>
            <input
              inputMode="numeric"
              value={kcal}
              onChange={(e) => setKcal(e.target.value.replace(/[^\d]/g, ""))}
              className="mt-1 w-full bg-transparent font-display text-3xl tabular-nums outline-none"
            />
          </label>
          <label className="card p-4">
            <span className="font-display text-xs uppercase text-pink">Protein (g)</span>
            <input
              inputMode="decimal"
              value={protein}
              onChange={(e) => setProtein(e.target.value.replace(/[^\d.]/g, ""))}
              className="mt-1 w-full bg-transparent font-display text-3xl tabular-nums outline-none"
            />
          </label>
        </div>

        {error && <p className="mb-3 text-sm text-pink">{error}</p>}
        <button className="btn-lime w-full text-lg" disabled={busy === "save"} onClick={save}>
          {busy === "save" ? "Saving..." : "Log it 💪"}
        </button>
      </>
    );
  }

  // Capture step --------------------------------------------------------------
  return (
    <>
      <h1 className="mb-5 font-display text-3xl uppercase">Snap it</h1>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <input ref={galleryRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />

      {preview ? (
        <div className="relative mb-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Your meal" className="aspect-[4/3] w-full rounded-3xl object-cover" />
          <button
            className="absolute right-3 top-3 rounded-full bg-black/70 px-3 py-1.5 text-sm"
            onClick={() => {
              setPhoto(null);
              setPreview(null);
            }}
          >
            ✕ Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => cameraRef.current?.click()}
          className="mb-3 flex aspect-[4/3] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-lime/50 bg-panel text-lime transition active:scale-[0.98]"
        >
          <span className="text-6xl" aria-hidden>
            📸
          </span>
          <span className="font-display text-lg uppercase">Take a photo</span>
        </button>
      )}
      {!preview && (
        <button className="btn-ghost mb-4 w-full" onClick={() => galleryRef.current?.click()}>
          Pick from gallery
        </button>
      )}

      <label className="mb-1.5 block font-display text-xs uppercase text-muted">
        Details (optional, makes it way more accurate)
      </label>
      <textarea
        value={hint}
        onChange={(e) => setHint(e.target.value)}
        maxLength={500}
        rows={2}
        placeholder="e.g. 200 g chicken, cooked in olive oil, big plate"
        className="input mb-4 resize-none"
      />

      {error && <p className="mb-3 text-sm text-pink">{error}</p>}

      <button
        className="btn-lime w-full text-lg"
        disabled={busy === "analyze" || (!photo && !hint.trim())}
        onClick={analyze}
      >
        {busy === "analyze" ? LOADING_LINES[line] : "Count my gainz ⚡"}
      </button>
      <button className="mt-3 w-full py-2 text-sm text-muted" onClick={() => applyAnalysis(MANUAL)}>
        Skip the AI, log numbers by hand
      </button>
    </>
  );
}
