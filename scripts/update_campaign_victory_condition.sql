-- Add victory condition to campaign: First to 21 points wins
UPDATE leagues 
SET scoring_config = scoring_config || '{"victory_condition": {"type": "threshold", "points": 21}}'::jsonb
WHERE id = '17ae4404-4411-4520-8b2d-5876d6a7bf90';

-- Verify the update
SELECT id, name, scoring_config->'victory_condition' as victory_condition
FROM leagues 
WHERE id = '17ae4404-4411-4520-8b2d-5876d6a7bf90';
