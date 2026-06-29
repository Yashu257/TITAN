
CREATE TABLE public.selfies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.selfies TO anon;
GRANT SELECT, INSERT, DELETE ON public.selfies TO authenticated;
GRANT ALL ON public.selfies TO service_role;

ALTER TABLE public.selfies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view selfies"
  ON public.selfies FOR SELECT
  USING (true);

CREATE POLICY "Anyone can submit a selfie"
  ON public.selfies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete selfies"
  ON public.selfies FOR DELETE
  USING (true);

CREATE INDEX selfies_created_at_idx ON public.selfies (created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.selfies;
ALTER TABLE public.selfies REPLICA IDENTITY FULL;
