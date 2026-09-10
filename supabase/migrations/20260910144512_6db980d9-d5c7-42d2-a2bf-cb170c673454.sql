CREATE TABLE public.day_logs (
  user_id uuid NOT NULL,
  log_date date NOT NULL,
  completed_items text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, log_date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_logs TO authenticated;
GRANT ALL ON public.day_logs TO service_role;
ALTER TABLE public.day_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own day logs" ON public.day_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);