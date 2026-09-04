#!/bin/bash
# ==============================================================================
# BLOW FITNESS SYSTEM — Database Disaster Recovery & Restore Script
# Usage: ./deploy/restore-db.sh /path/to/backup.sql.gz
# ==============================================================================

set -e

BACKUP_FILE="$1"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
    echo "Usage: $0 <path-to-compressed-backup.sql.gz>"
    echo "Example: $0 deploy/backups/blow_fitness_backup_20260904_120000.sql.gz"
    exit 1
fi

echo "=============================================================================="
echo "WARNING: This will overwrite the target database with data from:"
echo "${BACKUP_FILE}"
echo "=============================================================================="
read -p "Are you sure you want to proceed? (yes/no): " CONFIRM

if [ "${CONFIRM}" != "yes" ]; then
    echo "Restore aborted by user."
    exit 0
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Beginning database restoration..."

if command -v docker >/dev/null 2>&1 && docker ps | grep -q "blow_fitness_db"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restoring to Docker container blow_fitness_db..."
    gunzip -c "${BACKUP_FILE}" | docker exec -i blow_fitness_db psql -U "${POSTGRES_USER:-blow_admin}" -d "${POSTGRES_DB:-blow_fitness}"
else
    if [ -z "${DATABASE_URL}" ]; then
        echo "[ERROR] Neither Docker container nor DATABASE_URL found. Aborting."
        exit 1
    fi
    gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database successfully restored from ${BACKUP_FILE}."
