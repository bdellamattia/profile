"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/lib/nutrition";
import { createClient } from "@/lib/supabase/client";

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: claims } = await supabase.auth.getClaims();
      const id = claims?.claims.sub;
      if (!id) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, display_name, kcal_goal, protein_goal")
        .eq("id", id)
        .single();
      if (data) setProfile(data);
    })();
  }, []);

  return [profile, setProfile] as const;
}
