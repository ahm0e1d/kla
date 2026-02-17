-- Create staff_checkins table for tracking staff check-in/check-out
CREATE TABLE public.staff_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.approved_users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.staff_checkins ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view all staff checkins"
ON public.staff_checkins
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view their own checkins"
ON public.staff_checkins
FOR SELECT
USING (user_id IN (
  SELECT id FROM approved_users WHERE email = (SELECT auth.jwt() ->> 'email')
));

CREATE POLICY "Admins can insert staff checkins"
ON public.staff_checkins
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update staff checkins"
ON public.staff_checkins
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete staff checkins"
ON public.staff_checkins
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for staff_checkins
ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_checkins;