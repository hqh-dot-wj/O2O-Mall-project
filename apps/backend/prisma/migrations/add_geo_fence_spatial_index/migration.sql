-- Add GIST spatial index for sys_geo_fence.geom
-- This improves performance for ST_Contains queries

-- Create GIST index on geom column
CREATE INDEX IF NOT EXISTS idx_geo_fence_geom ON sys_geo_fence USING GIST (geom);

-- Add comment for documentation
COMMENT ON INDEX idx_geo_fence_geom IS 'Spatial index for fence geometry queries using PostGIS';
