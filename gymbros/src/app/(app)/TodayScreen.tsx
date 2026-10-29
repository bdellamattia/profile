"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Ring } from "@/components/Ring";
import { useProfile } from "@/components/useProfile";
import { localDay, shiftDay, type Meal } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/client";

function hype(protein: number, goal: number, meals: number) {
  if (meals === 0) return "Plate's empty, bro. Feed the machine.";
  const pct = protein / goal;
  if (pct >= 1) return "PROTEIN GOAL CRUSHED. Absolute unit. 🏆";
  if (pct >= 0.75) return "Almost there. One more shake and you're golden.";
  if (pct >= 0.4) return "Halfway to gainz. Keep stacking.";
  return "Warm-up set done. The real lifting starts now.";
}

function dayLabel(day: string) {
  const today = localDay();
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function TodayScreen() {
  const [profile] = useProfile();
  const [day, setDay] = useState(localDay);
  const [meals, setMeals] = useState<Meal[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const [version, setVersion] = useState(0);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("meals")
        .select("*")
        .eq("day", day)
        .order("eaten_at", { ascending: true });
      const list = (data ?? []) as Meal[];
      const paths = list.map((m) => m.photo_path).filter((p): p is string => Boolean(p));
      const { data: signed } = paths.length
        ? await supabase.storage.from("meal-photos").createSignedUrls(paths, 3600)
        : { data: [] };
      if (cancelled) return;
      setLoadError(Boolean(error));
      setMeals(list);
      setPhotos(Object.fromEntries((signed ?? []).map((s) => [s.path, s.signedUrl])));
    })();
    return () => {
      cancelled = true;
    };
  }, [day, version]);

  const totals = useMemo(
    () =>
      (meals ?? []).reduce(
        (a, m) => ({ kcal: a.kcal + m.kcal, protein: a.protein + Number(m.protein_g) }),
        { kcal: 0, protein: 0 },
      ),
    [meals],
  );

  async function remove(meal: Meal) {
    if (!confirm(`Delete "${meal.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("meals").delete().eq("id", meal.id);
    if (meal.photo_path) await supabase.storage.from("meal-photos").remove([meal.photo_path]);
    setVersion((v) => v + 1);
  }

  const kcalGoal = profile?.kcal_goal ?? 2500;
  const proteinGoal = profile?.protein_goal ?? 160;
  const isToday = day === localDay();

  return (
    <>
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">Yo {profile?.display_name ?? "bro"} 👊</p>
          <h1 className="font-display text-3xl uppercase">{dayLabel(day)}</h1>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost size-11 p-0" aria-label="Previous day" onClick={() => setDay(shiftDay(day, -1))}>
            ←
          </button>
          <button
            className="btn-ghost size-11 p-0"
            aria-label="Next day"
            disabled={isToday}
            onClick={() => setDay(shiftDay(day, 1))}
          >
            →
          </button>
        </div>
      </header>

      <section className="card mb-4 px-4 py-6">
        <div className="grid grid-cols-2 gap-2">
          <Ring value={totals.kcal} goal={kcalGoal} color="var(--lime)" label="Calories" />
          <Ring value={totals.protein} goal={proteinGoal} color="var(--pink)" label="Protein" unit="g" />
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          {loadError ? "Couldn't reach the server. Check your connection." : meals ? hype(totals.protein, proteinGoal, meals.length) : "Loading gainz..."}
        </p>
      </section>

      {isToday && (
        <Link href="/snap" className="btn-lime mb-6 w-full text-lg">
          📸 Snap a meal
        </Link>
      )}

      <h2 className="mb-3 font-display text-sm uppercase text-muted">
        Meals {meals && meals.length > 0 && `· ${meals.length}`}
      </h2>
      <ul className="flex flex-col gap-3">
        {meals?.length === 0 && (
          <li className="card p-6 text-center text-sm text-muted">Nothing logged. Suspicious. 🤨</li>
        )}
        {meals?.map((m) => (
          <li key={m.id} className="card flex items-center gap-3 p-3 animate-pop">
            {m.photo_path && photos[m.photo_path] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[m.photo_path]} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
            ) : (
              <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-panel-2 text-2xl">🍽️</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{m.name}</p>
              <p className="text-xs text-muted">
                {new Date(m.eaten_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                {m.confidence === "low" && " · rough guess"}
              </p>
              <p className="mt-1 text-sm tabular-nums">
                <span className="text-lime">{m.kcal} kcal</span>
                <span className="mx-1.5 text-muted">·</span>
                <span className="text-pink">{Number(m.protein_g)} g protein</span>
              </p>
            </div>
            <button onClick={() => remove(m)} aria-label={`Delete ${m.name}`} className="p-2 text-muted hover:text-pink">
              ✕
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
