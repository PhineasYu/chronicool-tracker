import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface DayLogRow {
  log_date: string;
  completed_items: string[];
}

export const getMyLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<DayLogRow[]> => {
    const { data, error } = await context.supabase
      .from("day_logs")
      .select("log_date, completed_items")
      .order("log_date", { ascending: false })
      .limit(400);
    if (error) throw new Error(error.message);
    return (data ?? []) as DayLogRow[];
  });

export const toggleScheduleItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        itemId: z.string().min(1).max(64),
        done: z.boolean(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<DayLogRow> => {
    const { supabase, userId } = context;

    const { data: existing, error: readError } = await supabase
      .from("day_logs")
      .select("log_date, completed_items")
      .eq("log_date", data.date)
      .maybeSingle();
    if (readError) throw new Error(readError.message);

    const current: string[] = existing?.completed_items ?? [];
    const next = data.done
      ? [...new Set([...current, data.itemId])]
      : current.filter((id) => id !== data.itemId);

    const { error } = await supabase
      .from("day_logs")
      .upsert(
        {
          user_id: userId,
          log_date: data.date,
          completed_items: next,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,log_date" },
      );
    if (error) throw new Error(error.message);

    return { log_date: data.date, completed_items: next };
  });
