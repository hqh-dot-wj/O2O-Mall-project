-- Rollback script for spatial index
-- Drop the GIST index on sys_geo_fence.geom

DROP INDEX IF EXISTS idx_geo_fence_geom;
