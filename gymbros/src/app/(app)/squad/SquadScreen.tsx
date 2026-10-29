"use client";

import { useEffect, useState } from "react";
import { localDay } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/client";

type Row = {
  user_id: string;
  display_name: string;
  kcal: number;
  protein_g: number;
  kcal_goal: number;
  protein_goal: number;
  meals: number;
};

const MEDALS = ["🥇", "🥈", "🥉"];

export function SquadScreen() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [me, setMe] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: claims } = await supabase.auth.getClaims();
      setMe(claims?.claims.sub ?? null);
      const { data } = await supabase.rpc("squad_board", { p_day: localDay() });
      setRows((data ?? []) as Row[]);
    })();
  }, []);

  return (
    <>
      <h1 className="font-display text-3xl uppercase">Squad</h1>
      <p className="mb-6 text-sm text-muted">Today&apos;s protein race. Ranked by % of goal, not raw grams.</p>

      <ul className="flex flex-col gap-3">
        {rows === null && <li className="text-sm text-muted">Loading the crew...</li>}
        {rows?.length === 0 && <li className="text-sm text-muted">No bros yet. Send them the link.</li>}
        {rows?.map((r, i) => {
          const pct = Math.round((Number(r.protein_g) / r.protein_goal) * 100);
          const kcalPct = Math.round((Number(r.kcal) / r.kcal_goal) * 100);
          const isMe = r.user_id === me;
          return (
            <li key={r.user_id} className={`card p-4 ${isMe ? "border-lime" : ""}`}>
              <div className="mb-3 flex items-center justify-between">
                <p className="font-semibold">
                  <span className="mr-2">{MEDALS[i] ?? `#${i + 1}`}</span>
                  {r.display_name}
                  {isMe && <span className="ml-2 text-xs text-lime">(you)</span>}
                </p>
                <span className="font-display text-xl tabular-nums text-pink">{pct}%</span>
              </div>
              <Bar pct={pct} color="var(--pink)" />
              <div className="mt-2 flex justify-between text-xs text-muted tabular-nums">
                <span>
                  {Number(r.protein_g)} / {r.protein_goal} g protein
                </span>
                <span>
                  {r.kcal} kcal · {kcalPct}%
                </span>
              </div>
              {r.meals === 0 && <p className="mt-2 text-xs text-muted">No meals logged yet. Fasting or slacking?</p>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-panel-2">
      <div
        className="h-full rounded-full transition-[width] duration-700"
        style={{ width: `${Math.min(pct, 100)}%`, background: color }}
      />
    </div>
  );
}
