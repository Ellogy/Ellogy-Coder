import { useState } from 'react';
import { toast } from 'react-toastify';
import * as RadixDialog from '@radix-ui/react-dialog';
import { Dialog, DialogClose, DialogTitle } from '~/components/ui/Dialog';
import { migrateIndexedDBToSupabase, clearIndexedDBData, type MigrationResult } from '~/lib/persistence/migration';

interface MigrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MigrationDialog({ isOpen, onClose }: MigrationDialogProps) {
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [showClearOption, setShowClearOption] = useState(false);

  const handleMigration = async () => {
    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await migrateIndexedDBToSupabase();
      setMigrationResult(result);

      if (result.success) {
        toast.success(
          `Migration completed successfully! Migrated ${result.migratedChats} chats and ${result.migratedSnapshots} snapshots.`,
        );
        setShowClearOption(true);
      } else {
        toast.error(`Migration completed with errors. Check the details below.`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Migration failed: ${errorMsg}`);
      setMigrationResult({
        success: false,
        migratedChats: 0,
        migratedSnapshots: 0,
        errors: [errorMsg],
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handleClearIndexedDB = async () => {
    if (!confirm('Are you sure you want to clear all IndexedDB data? This action cannot be undone!')) {
      return;
    }

    try {
      await clearIndexedDBData();
      toast.success('IndexedDB data cleared successfully');
      setShowClearOption(false);
      onClose();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to clear IndexedDB: ${errorMsg}`);
    }
  };

  const handleClose = () => {
    setMigrationResult(null);
    setShowClearOption(false);
    onClose();
  };

  return (
    <RadixDialog.Root open={isOpen} onOpenChange={handleClose}>
      <Dialog showCloseButton={false}>
        <div className="p-6 bg-white dark:bg-gray-950 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-xl font-semibold">Migrate to Supabase</DialogTitle>
            <DialogClose onClick={handleClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </DialogClose>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              This will migrate all your existing chats and snapshots from IndexedDB to Supabase. Your data will be
              preserved and accessible from any device once connected to Supabase.
            </p>

            {!migrationResult && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Before you start:</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Make sure you're connected to Supabase</li>
                    <li>• This process may take a few minutes depending on the amount of data</li>
                    <li>• Your IndexedDB data will remain intact until you choose to clear it</li>
                  </ul>
                </div>

                <div className="flex space-x-3">
                  <button
                    onClick={handleMigration}
                    disabled={isMigrating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isMigrating ? 'Migrating...' : 'Start Migration'}
                  </button>
                  <button
                    onClick={handleClose}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {migrationResult && (
              <div className="space-y-4">
                <div
                  className={`border rounded-lg p-4 ${
                    migrationResult.success ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <h3 className={`font-medium mb-2 ${migrationResult.success ? 'text-green-900' : 'text-yellow-900'}`}>
                    Migration {migrationResult.success ? 'Completed Successfully' : 'Completed with Issues'}
                  </h3>

                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Chats migrated:</strong> {migrationResult.migratedChats}
                    </p>
                    <p>
                      <strong>Snapshots migrated:</strong> {migrationResult.migratedSnapshots}
                    </p>

                    {migrationResult.errors.length > 0 && (
                      <div className="mt-3">
                        <p className="font-medium text-red-800">Errors encountered:</p>
                        <ul className="text-red-700 text-xs space-y-1 mt-1">
                          {migrationResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {showClearOption && (
                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-medium text-orange-900 mb-2">Clear IndexedDB Data</h3>
                    <p className="text-sm text-orange-800 mb-3">
                      Your data has been successfully migrated to Supabase. You can now safely clear the IndexedDB data
                      to free up local storage space.
                    </p>
                    <button
                      onClick={handleClearIndexedDB}
                      className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 text-sm"
                    >
                      Clear IndexedDB Data
                    </button>
                  </div>
                )}

                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Dialog>
    </RadixDialog.Root>
  );
}
