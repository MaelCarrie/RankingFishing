-- ─────────────────────────────────────────────────────────────────────────────
-- RankingFishing — Seed data
-- À exécuter dans Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Species ─────────────────────────────────────────────────────────────────
insert into public.species (id, name, name_fr, category, icon, score_coefficient, rarity_score) values
  ('carp',          'Carp',          'Carpe',              'freshwater', '🐟', 1.0, 5),
  ('pike',          'Pike',          'Brochet',            'freshwater', '🐠', 2.0, 10),
  ('zander',        'Zander',        'Sandre',             'freshwater', '🐡', 2.5, 12),
  ('catfish',       'Catfish',       'Silure',             'freshwater', '🦈', 0.5, 6),
  ('brown_trout',   'Brown Trout',   'Truite fario',       'freshwater', '🎣', 3.0, 15),
  ('rainbow_trout', 'Rainbow Trout', 'Truite arc-en-ciel', 'freshwater', '🎣', 2.5, 10),
  ('perch',         'Perch',         'Perche',             'freshwater', '🐟', 1.5, 4),
  ('black_bass',    'Black Bass',    'Black-bass',         'freshwater', '🐠', 2.0, 12),
  ('sea_bass',      'Sea Bass',      'Bar',                'saltwater',  '🐡', 2.0, 14),
  ('sea_bream',     'Sea Bream',     'Dorade',             'saltwater',  '🐟', 1.8, 12),
  ('tench',         'Tench',         'Tanche',             'freshwater', '🐟', 1.2, 6),
  ('roach',         'Roach',         'Gardon',             'freshwater', '🐟', 0.8, 2),
  ('eel',           'Eel',           'Anguille',           'migratory',  '🐍', 1.5, 10),
  ('salmon',        'Salmon',        'Saumon',             'migratory',  '🐟', 4.0, 20),
  ('asp',           'Asp',           'Aspe',               'freshwater', '🐠', 2.2, 16);

-- ─── Badges ──────────────────────────────────────────────────────────────────
insert into public.badges (id, name, description, icon, category, tier, xp_reward, target_value, target_metric, target_label) values
  ('badge_first_catch', 'Première prise',       'Enregistrer votre première capture',    '🎣', 'progression', 'bronze', 50,  1,     'total_captures',    '1 capture'),
  ('badge_10_catches',  'Pêcheur actif',        'Enregistrer 10 captures',               '🏅', 'progression', 'bronze', 100, 10,    'total_captures',    '10 captures'),
  ('badge_50_catches',  'Pêcheur assidu',       'Enregistrer 50 captures',               '🥈', 'progression', 'silver', 200, 50,    'total_captures',    '50 captures'),
  ('badge_100_catches', 'Centenaire',           'Enregistrer 100 captures',              '🏆', 'progression', 'gold',   500, 100,   'total_captures',    '100 captures'),
  ('badge_big_carp',    'Carpiste confirmé',    'Capturer une carpe de plus de 15kg',    '🐟', 'excellence',  'silver', 150, 15000, 'species_weight',    'Carpe 15kg+'),
  ('badge_big_pike',    'Chasseur de brochets', 'Capturer un brochet de plus de 8kg',    '🐠', 'excellence',  'gold',   300, 8000,  'species_weight',    'Brochet 8kg+'),
  ('badge_top100',      'Top 100',              'Atteindre le top 100 mondial',          '🌍', 'excellence',  'gold',   500, 100,   'global_rank',       'Top 100 mondial'),
  ('badge_validator',   'Validateur',           'Valider 20 captures de la communauté',  '✅', 'community',   'bronze', 75,  20,    'validations',       '20 validations'),
  ('badge_spring',      'Pêcheur de printemps', 'Réaliser 5 captures en mars-mai',       '🌸', 'seasonal',    'silver', 120, 5,     'seasonal_captures', '5 captures au printemps');
