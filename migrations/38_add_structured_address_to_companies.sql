-- Migration: Add structured address columns to companies
-- This is necessary for PagBank integration which requires detailed address info

ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS address_street TEXT,
ADD COLUMN IF NOT EXISTS address_number TEXT,
ADD COLUMN IF NOT EXISTS address_complement TEXT,
ADD COLUMN IF NOT EXISTS address_district TEXT,
ADD COLUMN IF NOT EXISTS address_city TEXT,
ADD COLUMN IF NOT EXISTS address_state TEXT,
ADD COLUMN IF NOT EXISTS address_zip TEXT;

-- Optional: Initial migration of existing TEXT 'endereco' to 'address_street' (very basic)
-- UPDATE companies SET address_street = endereco WHERE address_street IS NULL;
