-- Change default status to 'aprovado' so stores are active immediately upon creation
ALTER TABLE marketplace_stores ALTER COLUMN status SET DEFAULT 'aprovado';
