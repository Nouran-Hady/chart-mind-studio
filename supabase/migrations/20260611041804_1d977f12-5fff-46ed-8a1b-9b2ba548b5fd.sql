
CREATE TABLE public.pinned_charts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES public.chat_threads(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  chart_config JSONB NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pinned_charts TO authenticated;
GRANT ALL ON public.pinned_charts TO service_role;
ALTER TABLE public.pinned_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own pinned charts" ON public.pinned_charts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX pinned_charts_dataset_idx ON public.pinned_charts(dataset_id, created_at DESC);
