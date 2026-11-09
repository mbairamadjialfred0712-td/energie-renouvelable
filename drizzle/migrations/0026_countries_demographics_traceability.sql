-- Ajout additif : traçabilité démographique au niveau pays. Aucune donnée existante n'est modifiée ni supprimée.
ALTER TABLE public.countries
  ADD COLUMN IF NOT EXISTS population bigint,
  ADD COLUMN IF NOT EXISTS population_year integer,
  ADD COLUMN IF NOT EXISTS population_source text,
  ADD COLUMN IF NOT EXISTS population_method text,
  ADD COLUMN IF NOT EXISTS population_updated_at timestamptz;

ALTER TABLE public.countries
  ADD CONSTRAINT countries_population_method_check
  CHECK (population_method IS NULL OR population_method IN ('recensement', 'estimation', 'projection'));

-- Valeur nationale de référence pour la Côte d'Ivoire : source officielle nationale (ANStat),
-- projection démographique 2026 publiée le 10/09/2026. Ce n'est PAS un recensement.
UPDATE public.countries
SET population = 33293101,
    population_year = 2026,
    population_source = 'ANStat (anstat.ci) — projection démographique 2026, mise à jour du 10/09/2026',
    population_method = 'projection',
    population_updated_at = now()
WHERE iso2 = 'CI';