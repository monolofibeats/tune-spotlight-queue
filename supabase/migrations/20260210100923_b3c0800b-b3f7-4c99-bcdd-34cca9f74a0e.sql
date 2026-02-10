
-- Table to track stem separation jobs
CREATE TABLE public.stem_separation_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
  stem_type TEXT NOT NULL, -- 'vocals', 'drums', 'bass', 'guitar', 'piano', 'synth', 'strings', 'wind'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'uploading', 'processing', 'completed', 'error'
  lalal_source_id TEXT,
  lalal_task_id TEXT,
  progress INTEGER DEFAULT 0,
  stem_url TEXT, -- URL to the separated stem file in storage
  back_url TEXT, -- URL to the "back" track (everything except the stem)
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.stem_separation_jobs ENABLE ROW LEVEL SECURITY;

-- Streamers can view stem jobs for submissions in their queue
CREATE POLICY "Streamers can view their stem jobs"
ON public.stem_separation_jobs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.streamers st ON s.streamer_id = st.id
    WHERE s.id = stem_separation_jobs.submission_id
    AND st.user_id = auth.uid()
  )
);

-- Streamers can create stem jobs for their submissions
CREATE POLICY "Streamers can create stem jobs"
ON public.stem_separation_jobs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.submissions s
    JOIN public.streamers st ON s.streamer_id = st.id
    WHERE s.id = stem_separation_jobs.submission_id
    AND st.user_id = auth.uid()
  )
);

-- Admins can do everything
CREATE POLICY "Admins can manage all stem jobs"
ON public.stem_separation_jobs
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update trigger
CREATE TRIGGER update_stem_separation_jobs_updated_at
BEFORE UPDATE ON public.stem_separation_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for quick lookups
CREATE INDEX idx_stem_jobs_submission_id ON public.stem_separation_jobs(submission_id);
CREATE INDEX idx_stem_jobs_status ON public.stem_separation_jobs(status);

-- Enable realtime for progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.stem_separation_jobs;
