-- Adicionar campos de GPS na tabela atividade_sessao
ALTER TABLE public.atividade_sessao
ADD COLUMN distance_km numeric,
ADD COLUMN pace_avg numeric,
ADD COLUMN route jsonb;

-- Comentários para documentação
COMMENT ON COLUMN public.atividade_sessao.distance_km IS 'Distância percorrida em km (calculada via GPS)';
COMMENT ON COLUMN public.atividade_sessao.pace_avg IS 'Ritmo médio em minutos por km';
COMMENT ON COLUMN public.atividade_sessao.route IS 'Array de pontos GPS da rota [{lat, lng, timestamp}]';