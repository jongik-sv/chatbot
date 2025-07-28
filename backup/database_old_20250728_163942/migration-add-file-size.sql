-- Migration: Add file_size column to documents table
-- Date: 2025-07-28

-- Add file_size column if it doesn't exist
ALTER TABLE documents ADD COLUMN file_size INTEGER DEFAULT 0;

-- Update existing records with file size from metadata if available
UPDATE documents 
SET file_size = CAST(
  CASE 
    WHEN json_extract(metadata, '$.fileSize') IS NOT NULL 
    THEN json_extract(metadata, '$.fileSize')
    ELSE 0
  END AS INTEGER
)
WHERE file_size = 0;