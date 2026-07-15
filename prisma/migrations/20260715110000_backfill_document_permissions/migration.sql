UPDATE "Role"
SET "permissions" = ARRAY(
  SELECT DISTINCT permission
  FROM unnest("permissions" || ARRAY['VIEW_FILES']::"PermissionKey"[]) AS permission
)
WHERE NOT "permissions" @> ARRAY['VIEW_FILES']::"PermissionKey"[];

UPDATE "Role"
SET "permissions" = ARRAY(
  SELECT DISTINCT permission
  FROM unnest("permissions" || ARRAY['MANAGE_FILES']::"PermissionKey"[]) AS permission
)
WHERE "systemKey" IN ('ADMIN', 'MANAGER')
  AND NOT "permissions" @> ARRAY['MANAGE_FILES']::"PermissionKey"[];
