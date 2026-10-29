export type FoodItem = {
  name: string;
  portion: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export type Analysis = {
  is_food: boolean;
  dish: string;
  items: FoodItem[];
  confidence: "low" | "medium" | "high";
  bro_comment: string;
  totals: { kcal: number; protein_g: number; carbs_g: number; fat_g: number };
};

export type Meal = {
  id: string;
  day: string;
  eaten_at: string;
  name: string;
  items: FoodItem[];
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence: string | null;
  photo_path: string | null;
};

export type Profile = {
  id: string;
  display_name: string;
  kcal_goal: number;
  protein_goal: number;
};

export function sumItems(items: FoodItem[]) {
  const t = items.reduce(
    (acc, i) => ({
      kcal: acc.kcal + i.kcal,
      protein_g: acc.protein_g + i.protein_g,
      carbs_g: acc.carbs_g + i.carbs_g,
      fat_g: acc.fat_g + i.fat_g,
    }),
    { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  );
  return {
    kcal: Math.round(t.kcal),
    protein_g: round1(t.protein_g),
    carbs_g: round1(t.carbs_g),
    fat_g: round1(t.fat_g),
  };
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Local calendar day as YYYY-MM-DD (not UTC, so a late dinner counts for today). */
export function localDay(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function shiftDay(day: string, delta: number) {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + delta));
}

export const DAILY_AI_LIMIT = Number(process.env.NEXT_PUBLIC_DAILY_AI_LIMIT ?? 25);
