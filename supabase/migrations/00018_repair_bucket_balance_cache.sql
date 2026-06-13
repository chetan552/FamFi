-- Repair and backfill bucket balance cache from existing transactions.
--
-- The Flutter app reads buckets.cached_balance for Family Bank Balance.
-- If the transaction trigger is missing, disabled, or balances were reset,
-- completed transactions can exist while the displayed balance remains $0.

CREATE OR REPLACE FUNCTION public.recalculate_bucket_balance(bucket_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.buckets
  SET cached_balance = COALESCE(
    (
      SELECT SUM(t.amount)
      FROM public.transactions t
      WHERE t.bucket_id = bucket_uuid
        AND t.status = 'completed'
    ),
    0.00
  )
  WHERE id = bucket_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_recalculate_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_bucket_balance(OLD.bucket_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_bucket_balance(NEW.bucket_id);

  IF TG_OP = 'UPDATE' AND OLD.bucket_id IS DISTINCT FROM NEW.bucket_id THEN
    PERFORM public.recalculate_bucket_balance(OLD.bucket_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_transactions_balance ON public.transactions;

CREATE TRIGGER trg_transactions_balance
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.trigger_recalculate_balance();

UPDATE public.buckets b
SET cached_balance = COALESCE(t.balance, 0.00)
FROM (
  SELECT bucket_id, SUM(amount) AS balance
  FROM public.transactions
  WHERE status = 'completed'
  GROUP BY bucket_id
) t
WHERE b.id = t.bucket_id;

UPDATE public.buckets b
SET cached_balance = 0.00
WHERE NOT EXISTS (
  SELECT 1
  FROM public.transactions t
  WHERE t.bucket_id = b.id
    AND t.status = 'completed'
);
