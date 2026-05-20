
CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_submissions_user_created ON public.submissions(user_id, created_at DESC);

CREATE TABLE public.results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  trust_score INTEGER NOT NULL,
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high')),
  explanation TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own submissions" ON public.submissions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own submissions" ON public.submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own submissions" ON public.submissions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own submissions" ON public.submissions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users view own results" ON public.results
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.submissions s WHERE s.id = results.submission_id AND s.user_id = auth.uid())
  );
