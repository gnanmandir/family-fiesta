-- Run this in Supabase SQL Editor to allow wiping orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public deletes on orders" ON public.orders;
CREATE POLICY "Allow public deletes on orders" 
ON public.orders 
FOR DELETE 
USING (true);

DROP POLICY IF EXISTS "Allow public deletes on device_locks" ON public.device_locks;
CREATE POLICY "Allow public deletes on device_locks" 
ON public.device_locks 
FOR DELETE 
USING (true);
