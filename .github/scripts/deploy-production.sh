#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="/opt/team-kanban-board"
BACKUP_DIR="/opt/team-kanban-backups"
RELEASE_ROOT="/opt/team-kanban-releases"
COMPOSE_FILE="docker-compose.production.yml"
SHORT_SHA="${RELEASE_SHA:0:12}"
RELEASE_DIR="${RELEASE_ROOT}/${SHORT_SHA}"
BACKUP_PATH="${BACKUP_DIR}/pre-github-$(date -u +%Y%m%dT%H%M%SZ)-${SHORT_SHA}.tgz"
CANDIDATE_IMAGE="team-kanban-board-app:candidate-${SHORT_SHA}"
LIVE_IMAGE="team-kanban-board-app:latest"
OLD_IMAGE=""
SOURCE_SWITCHED=0
DEPLOY_FINISHED=0

compose() {
  docker compose --env-file .env.production -f "${COMPOSE_FILE}" "$@"
}

cleanup_deploy_storage() {
  # BuildKit cache can grow indefinitely across releases and eventually make
  # image export fail. This only removes cache and images not used by running
  # containers; named volumes and the live application image are preserved.
  docker builder prune --all --force >/dev/null || true
  docker image prune --force >/dev/null || true
  find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'pre-github-*.tgz' -mtime +14 -delete
}

ensure_telegram_webhook_secret() {
  if grep -Eq '^TELEGRAM_WEBHOOK_SECRET=.+$' .env.production; then
    return
  fi

  local webhook_secret
  webhook_secret="$(openssl rand -hex 32)"
  if grep -q '^TELEGRAM_WEBHOOK_SECRET=' .env.production; then
    sed -i "s/^TELEGRAM_WEBHOOK_SECRET=.*/TELEGRAM_WEBHOOK_SECRET=${webhook_secret}/" .env.production
  else
    printf '\nTELEGRAM_WEBHOOK_SECRET=%s\n' "${webhook_secret}" >> .env.production
  fi
}

ensure_notification_cron_secret() {
  if grep -Eq '^NOTIFICATION_CRON_SECRET=.+$' .env.production; then
    return
  fi

  local cron_secret
  cron_secret="$(openssl rand -hex 32)"
  if grep -q '^NOTIFICATION_CRON_SECRET=' .env.production; then
    sed -i "s/^NOTIFICATION_CRON_SECRET=.*/NOTIFICATION_CRON_SECRET=${cron_secret}/" .env.production
  else
    printf '\nNOTIFICATION_CRON_SECRET=%s\n' "${cron_secret}" >> .env.production
  fi
}

has_failed_important_files_migration() {
  compose exec -T app node <<'NODE'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const migrationName = "20260714220000_important_files";

(async () => {
  const table = await prisma.$queryRawUnsafe("SELECT to_regclass('public._prisma_migrations') AS table_name");
  if (!table[0]?.table_name) {
    await prisma.$disconnect();
    process.exit(1);
  }

  const rows = await prisma.$queryRawUnsafe(
    'SELECT "finished_at", "rolled_back_at", "applied_steps_count", "logs" FROM "_prisma_migrations" WHERE "migration_name" = $1 ORDER BY "started_at" DESC LIMIT 1',
    migrationName,
  );
  await prisma.$disconnect();

  const row = rows[0];
  const failedBeforeAnyStep =
    row &&
    row.finished_at === null &&
    row.rolled_back_at === null &&
    Number(row.applied_steps_count) === 0 &&
    typeof row.logs === "string" &&
    row.logs.includes("syntax error at or near") &&
    row.logs.includes("ALTER");

  process.exit(failedBeforeAnyStep ? 0 : 1);
})().catch(async () => {
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
NODE
}

recover_important_files_migration() {
  if has_failed_important_files_migration; then
    compose exec -T app npx prisma migrate resolve --rolled-back 20260714220000_important_files
  fi
}

restore_previous_release() {
  if [[ "${SOURCE_SWITCHED}" -eq 1 && -f "${BACKUP_PATH}" ]]; then
    find "${APP_DIR}" -mindepth 1 -maxdepth 1 \
      ! -name '.env.production' \
      ! -name 'uploads' \
      -exec rm -rf -- {} +
    tar -xzf "${BACKUP_PATH}" -C "${APP_DIR}"
  fi

  if [[ -n "${OLD_IMAGE}" ]]; then
    docker tag "${OLD_IMAGE}" "${LIVE_IMAGE}"
    cd "${APP_DIR}"
    compose up -d --no-deps --no-build --force-recreate app scheduler || true
  fi
}

on_exit() {
  status=$?
  if [[ "${status}" -ne 0 && "${DEPLOY_FINISHED}" -ne 1 ]]; then
    echo "Deployment failed; restoring the previous application release." >&2
    restore_previous_release
  fi
  rm -f "${ARCHIVE_PATH}"
  rm -rf "${RELEASE_DIR}"
  exit "${status}"
}
trap on_exit EXIT

mkdir -p "${BACKUP_DIR}" "${RELEASE_ROOT}"
cleanup_deploy_storage
rm -rf "${RELEASE_DIR}"
mkdir -p "${RELEASE_DIR}"
tar -xzf "${ARCHIVE_PATH}" -C "${RELEASE_DIR}"

tar \
  --exclude='./.env.production' \
  --exclude='./uploads' \
  --exclude='./node_modules' \
  --exclude='./.next' \
  -czf "${BACKUP_PATH}" -C "${APP_DIR}" .

docker build --pull -t "${CANDIDATE_IMAGE}" "${RELEASE_DIR}"

if docker inspect team-kanban-app >/dev/null 2>&1; then
  OLD_IMAGE="$(docker inspect --format='{{.Image}}' team-kanban-app)"
fi

find "${APP_DIR}" -mindepth 1 -maxdepth 1 \
  ! -name '.env.production' \
  ! -name 'uploads' \
  -exec rm -rf -- {} +
cp -a "${RELEASE_DIR}/." "${APP_DIR}/"
SOURCE_SWITCHED=1

docker tag "${CANDIDATE_IMAGE}" "${LIVE_IMAGE}"
cd "${APP_DIR}"
ensure_telegram_webhook_secret
ensure_notification_cron_secret
compose up -d --no-deps --no-build --force-recreate app scheduler
recover_important_files_migration
compose exec -T app npx prisma migrate deploy

healthy=0
for _ in $(seq 1 30); do
  if docker exec team-kanban-app node -e \
    "fetch('http://127.0.0.1:3000/login').then(r => { if (!r.ok) process.exit(1) })" \
    >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep 2
done

if [[ "${healthy}" -ne 1 ]]; then
  echo "The application did not pass its readiness check." >&2
  exit 1
fi

if compose exec -T app node -e "process.exit(process.env.TELEGRAM_BOT_TOKEN ? 0 : 1)"; then
  compose exec -T app node scripts/setup-telegram-webhook.mjs
fi

docker image rm "${CANDIDATE_IMAGE}" >/dev/null 2>&1 || true
DEPLOY_FINISHED=1
echo "Deployment ${SHORT_SHA} completed. Backup: ${BACKUP_PATH}"
