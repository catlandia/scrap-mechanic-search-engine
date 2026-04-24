-- Fake-reboot support for the Creator-only /admin/abuse lane. Rows marked
-- is_prank render the same countdown banner + SFX as a real deploy but
-- swap to a "just kidding :^)" note at zero and self-hide after ~10
-- seconds. Never completed, never trigger client auto-reload.
ALTER TABLE "deploy_announcements" ADD COLUMN IF NOT EXISTS "is_prank" boolean NOT NULL DEFAULT false;
