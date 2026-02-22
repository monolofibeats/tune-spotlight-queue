
-- Drop the vulnerable INSERT policy
DROP POLICY "Authenticated users can create submissions" ON public.submissions;

-- New policy: regular users can only insert FREE, NON-PRIORITY submissions
-- Priority submissions (is_priority=true or amount_paid>0) can only be inserted
-- by admins or service role (edge functions after payment verification)
CREATE POLICY "Users can create free submissions only"
ON public.submissions
FOR INSERT
WITH CHECK (
  -- Admin bypass: admins can insert anything
  has_role(auth.uid(), 'admin'::app_role)
  OR (
    -- Regular users (authenticated or anonymous): must be non-priority with zero payment
    is_priority = false
    AND amount_paid = 0
    AND boost_amount = 0
    AND (
      (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
      OR
      (auth.uid() IS NULL AND user_id IS NULL)
    )
  )
);
