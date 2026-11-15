ALTER TABLE role_instructions ADD COLUMN provider TEXT NOT NULL DEFAULT 'mock' CHECK(provider IN ('Claude','ChatGPT','Gemini','mock'));
ALTER TABLE role_instructions ADD COLUMN legacy_prompt TEXT NOT NULL DEFAULT '';
ALTER TABLE business_rules ADD COLUMN description TEXT NOT NULL DEFAULT '';
