-- Add final video fields to projects for exported concatenated video
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS final_video_path TEXT,
  ADD COLUMN IF NOT EXISTS final_video_url TEXT;

COMMENT ON COLUMN projects.final_video_path IS 'Storage path of the concatenated final video';
COMMENT ON COLUMN projects.final_video_url IS 'Signed or public URL for the final video';
