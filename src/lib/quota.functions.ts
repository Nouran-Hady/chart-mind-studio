import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DAILY_LIMIT = 5;
export const MONTHLY_DAYS_LIMIT = 5;

export const getQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context;
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const todayKey = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    )
      .toISOString()
      .slice(0, 10);

    const { data, error } = await supabase
      .from("chat_messages")
      .select("created_at")
      .eq("role", "user")
      .gte("created_at", startOfMonth.toISOString());
    if (error) throw new Error(error.message);

    const days = new Set<string>();
    let today = 0;
    for (const r of data ?? []) {
      const d = new Date(r.created_at as string).toISOString().slice(0, 10);
      days.add(d);
      if (d === todayKey) today++;
    }
    return {
      dailyLimit: DAILY_LIMIT,
      monthlyDaysLimit: MONTHLY_DAYS_LIMIT,
      usedToday: today,
      remainingToday: Math.max(0, DAILY_LIMIT - today),
      daysUsedThisMonth: days.size,
      remainingDaysThisMonth: Math.max(0, MONTHLY_DAYS_LIMIT - days.size),
      todayIsActive: days.has(todayKey),
    };
  });
