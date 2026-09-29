-- Upgrade an existing Neon database without dropping or recreating application data.
-- Run this once in the Neon SQL Editor after taking a database backup.

BEGIN;

-- Allow the longer mixed course type while replacing the old two-value constraint.
ALTER TABLE public.mata_kuliah
    DROP CONSTRAINT IF EXISTS mata_kuliah_tipe_check;
ALTER TABLE public.mata_kuliah
    ALTER COLUMN tipe TYPE character varying(20);
ALTER TABLE public.mata_kuliah
    ADD CONSTRAINT mata_kuliah_tipe_check
    CHECK (tipe IN ('Teori', 'Praktikum', 'Teori & Praktikum'));

-- The old schema did not declare these IDs as keys. Unique indexes allow the
-- mapping table to reference them without rebuilding either existing table.
CREATE UNIQUE INDEX IF NOT EXISTS mata_kuliah_id_unique
    ON public.mata_kuliah (id);
CREATE UNIQUE INDEX IF NOT EXISTS users_id_unique
    ON public.users (id);

-- Many-to-many assignment. The composite primary key also supports the API's
-- ON CONFLICT (mata_kuliah_id, pj_id) insert behavior.
CREATE TABLE IF NOT EXISTS public.mata_kuliah_pj (
    mata_kuliah_id integer NOT NULL,
    pj_id integer NOT NULL,
    CONSTRAINT mata_kuliah_pj_pkey PRIMARY KEY (mata_kuliah_id, pj_id)
);

-- Backfill the current single-PJ assignment into the new relation.
INSERT INTO public.mata_kuliah_pj (mata_kuliah_id, pj_id)
SELECT mk.id, mk.pj_id
FROM public.mata_kuliah mk
JOIN public.users u ON u.id = mk.pj_id
WHERE mk.pj_id IS NOT NULL
ON CONFLICT (mata_kuliah_id, pj_id) DO NOTHING;

-- Add referential integrity for new mappings and keep the old compatibility
-- column valid. NOT VALID preserves any pre-existing orphaned IDs while still
-- enforcing the constraints on future writes.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mata_kuliah_pj_mata_kuliah_id_fkey'
          AND conrelid = 'public.mata_kuliah_pj'::regclass
    ) THEN
        ALTER TABLE public.mata_kuliah_pj
            ADD CONSTRAINT mata_kuliah_pj_mata_kuliah_id_fkey
            FOREIGN KEY (mata_kuliah_id)
            REFERENCES public.mata_kuliah (id)
            ON DELETE CASCADE
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mata_kuliah_pj_pj_id_fkey'
          AND conrelid = 'public.mata_kuliah_pj'::regclass
    ) THEN
        ALTER TABLE public.mata_kuliah_pj
            ADD CONSTRAINT mata_kuliah_pj_pj_id_fkey
            FOREIGN KEY (pj_id)
            REFERENCES public.users (id)
            ON DELETE CASCADE
            NOT VALID;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'mata_kuliah_pj_id_fkey'
          AND conrelid = 'public.mata_kuliah'::regclass
    ) THEN
        ALTER TABLE public.mata_kuliah
            ADD CONSTRAINT mata_kuliah_pj_id_fkey
            FOREIGN KEY (pj_id)
            REFERENCES public.users (id)
            ON DELETE SET NULL
            NOT VALID;
    END IF;
END $$;

COMMIT;

SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'mata_kuliah'
  AND column_name = 'tipe';

SELECT to_regclass('public.mata_kuliah_pj');

SELECT COUNT(*) AS jumlah_assignment_pj
FROM public.mata_kuliah_pj;
