#!/bin/bash
# ==============================================================================
# BLOW FITNESS SYSTEM — Automated Database Backup Script
# Performs compressed pg_dump and enforces retention policy (default: 14 days)
# Add to crontab: 0 2 * * * /path/to/deploy/backup-db.sh >> /var/log/blow_backup.log 2>&1
# ==============================================================================

set -e

BACKUP_DIR="${BACKUP_DIR:-$(dirname "$0")/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/blow_fitness_backup_${TIMESTAMP}.sql.gz"
RETENTION_DAYS=14

mkdir -p "${BACKUP_DIR}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting automated PostgreSQL backup..."

# If running inside Docker Compose
if command -v docker >/dev/null 2>&1 && docker ps | grep -q "blow_fitness_db"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Exporting from Docker container blow_fitness_db..."
    docker exec -t blow_fitness_db pg_dump -U "${POSTGRES_USER:-blow_admin}" -d "${POSTGRES_DB:-blow_fitness}" -F p | gzip > "${BACKUP_FILE}"
else
    # Direct pg_dump via DATABASE_URL
    if [ -z "${DATABASE_URL}" ]; then
        echo "[ERROR] Neither Docker container nor DATABASE_URL found. Aborting."
        exit 1
    fi
    pg_dump "${DATABASE_URL}" -F p | gzip > "${BACKUP_FILE}"
fi

FILESIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup successfully created: ${BACKUP_FILE} (${FILESIZE})"

# Enforce retention policy: delete backups older than RETENTION_DAYS
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -type f -name "blow_fitness_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -exec rm -f {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup process complete."
