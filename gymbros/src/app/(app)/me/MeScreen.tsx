"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/components/useProfile";
import { localDay, shiftDay } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/login/actions";

type DayTotal = { day: string; kcal: number; protein: number };

export function MeScreen() {
  const [profile, setProfile] = useProfile();
  const [saved, setSaved] = useState(false);
  const [week, setWeek] = useState<DayTotal[]>([]);

  useEffect(() => {
    const supabase = createClient();
    const today = localDay();
    const days = Array.from({ length: 7 }, (_, i) => shiftDay(today, i - 6));
    (async () => {
      const { data } = await supabase
        .from("meals")
        .select("day, kcal, protein_g")
        .gte("day", days[0])
        .lte("day", today);
      setWeek(
        days.map((d) => {
          const rows = (data ?? []).filter((r) => r.day === d);
          return {
            day: d,
            kcal: rows.reduce((a, r) => a + r.kcal, 0),
            protein: rows.reduce((a, r) => a + Number(r.protein_g), 0),
          };
        }),
      );
    })();
  }, []);

  async function save(form: FormData) {
    if (!profile) return;
    const update = {
      display_name: String(form.get("name")).trim().slice(0, 30) || profile.display_name,
      kcal_goal: Math.min(8000, Math.max(800, Number(form.get("kcal")) || profile.kcal_goal)),
      protein_goal: Math.min(500, Math.max(20, Number(form.get("protein")) || profile.protein_goal)),
    };
    const supabase = createClient();
    const { error } = await supabase.from("profiles").update(update).eq("id", profile.id);
    if (!error) {
      setProfile({ ...profile, ...update });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const proteinGoal = profile?.protein_goal ?? 160;
  const hitDays = week.filter((d) => d.protein >= proteinGoal).length;

  return (
    <>
      <h1 className="mb-6 font-display text-3xl uppercase">Me</h1>

      <section className="card mb-4 p-4">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-sm uppercase">Last 7 days</h2>
          <span className="text-sm text-muted">
            Protein goal hit <span className="font-display text-pink">{hitDays}/7</span>
          </span>
        </div>
        <div className="flex h-32 items-end gap-2">
          {week.map((d) => {
            const pct = Math.min(d.protein / proteinGoal, 1.2);
            const [, , dd] = d.day.split("-");
            return (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex h-24 w-full items-end">
                  <div
                    className={`w-full rounded-lg ${d.protein >= proteinGoal ? "bg-pink" : "bg-panel-2"}`}
                    style={{ height: `${Math.max(pct * 83, 4)}%` }}
                    title={`${Math.round(d.protein)} g · ${d.kcal} kcal`}
                  />
                </div>
                <span className="text-[10px] text-muted tabular-nums">{dd}</span>
              </div>
            );
          })}
        </div>
      </section>

      {profile && (
        <form action={save} className="card mb-4 flex flex-col gap-3 p-4">
          <h2 className="font-display text-sm uppercase">Goals</h2>
          <label className="text-xs text-muted">
            Bro name
            <input name="name" defaultValue={profile.display_name} maxLength={30} className="input mt-1" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted">
              Calories / day
              <input name="kcal" inputMode="numeric" defaultValue={profile.kcal_goal} className="input mt-1" />
            </label>
            <label className="text-xs text-muted">
              Protein (g) / day
              <input name="protein" inputMode="numeric" defaultValue={profile.protein_goal} className="input mt-1" />
            </label>
          </div>
          <p className="text-xs text-muted">
            Common lifter target: about 1.6 to 2.2 g of protein per kg of bodyweight. Not medical advice.
          </p>
          <button className="btn-lime">{saved ? "Saved ✓" : "Save"}</button>
        </form>
      )}

      <form action={signOut}>
        <button className="btn-ghost w-full">Sign out</button>
      </form>
    </>
  );
}
