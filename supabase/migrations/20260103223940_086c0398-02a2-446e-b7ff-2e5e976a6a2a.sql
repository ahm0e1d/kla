-- Create rule categories table
CREATE TABLE public.rule_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create rules table
CREATE TABLE public.rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.rule_categories(id) ON DELETE CASCADE,
  content text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rule_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rules ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories and rules
CREATE POLICY "Anyone can view rule categories" 
ON public.rule_categories 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can view rules" 
ON public.rules 
FOR SELECT 
USING (true);

-- Only admins can manage categories
CREATE POLICY "Admins can insert rule categories" 
ON public.rule_categories 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update rule categories" 
ON public.rule_categories 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rule categories" 
ON public.rule_categories 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can manage rules
CREATE POLICY "Admins can insert rules" 
ON public.rules 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update rules" 
ON public.rules 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete rules" 
ON public.rules 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));