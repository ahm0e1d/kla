-- Create job_applications table for recruitment system
CREATE TABLE public.job_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    account_name TEXT NOT NULL,
    character_name TEXT NOT NULL,
    discord_username TEXT NOT NULL,
    level TEXT NOT NULL,
    game_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    handled_by_email TEXT,
    handled_by_discord TEXT,
    assigned_role_id UUID REFERENCES public.custom_roles(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for job applications
CREATE POLICY "Anyone can submit job applications" 
ON public.job_applications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view all job applications" 
ON public.job_applications 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can update job applications" 
ON public.job_applications 
FOR UPDATE 
USING (true);

CREATE POLICY "Admins can delete job applications" 
ON public.job_applications 
FOR DELETE 
USING (true);