import { useState, useEffect } from 'react';
import { isMigrationNeeded } from '~/lib/persistence/migration';

export function useMigration() {
  const [migrationNeeded, setMigrationNeeded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkMigrationStatus = async () => {
      try {
        setIsChecking(true);

        const needed = await isMigrationNeeded();
        setMigrationNeeded(needed);
      } catch (error) {
        console.error('Failed to check migration status:', error);
        setMigrationNeeded(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkMigrationStatus();
  }, []);

  return {
    migrationNeeded,
    isChecking,
  };
}
