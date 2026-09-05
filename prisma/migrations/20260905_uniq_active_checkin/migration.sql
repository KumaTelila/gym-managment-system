-- Partial unique index to guarantee single active check-in session per member at database engine level (F-03)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_checkin_per_member
  ON "CheckinSession" ("memberId")
  WHERE "sessionStatus" = 'ACTIVE';
