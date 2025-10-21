import { openDatabase } from './db';
import { supabaseChatClient } from './supabaseClient';
import { getAll, getSnapshot } from './db';

export interface MigrationResult {
  success: boolean;
  migratedChats: number;
  migratedSnapshots: number;
  errors: string[];
}

/**
 * Migrate all chats and snapshots from IndexedDB to Supabase
 */
export async function migrateIndexedDBToSupabase(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedChats: 0,
    migratedSnapshots: 0,
    errors: [],
  };

  try {
    // Check if Supabase is available
    const isSupabaseAvailable = await supabaseChatClient.isConnected();

    if (!isSupabaseAvailable) {
      throw new Error('Supabase is not connected. Please connect to Supabase first.');
    }

    // Open IndexedDB
    const db = await openDatabase();

    if (!db) {
      throw new Error('IndexedDB is not available');
    }

    // Get all chats from IndexedDB
    const chats = await getAll(db);
    console.log(`Found ${chats.length} chats to migrate`);

    // Migrate each chat
    for (const chat of chats) {
      try {
        // Save chat to Supabase
        await supabaseChatClient.setMessages(
          chat.id,
          chat.messages,
          chat.urlId,
          chat.description,
          chat.timestamp,
          chat.metadata,
        );

        // Try to get and migrate snapshot
        try {
          const snapshot = await getSnapshot(db, chat.id);

          if (snapshot) {
            await supabaseChatClient.setSnapshot(chat.id, snapshot);
            result.migratedSnapshots++;
          }
        } catch {
          // Snapshot might not exist, that's okay
          console.log(`No snapshot found for chat ${chat.id}`);
        }

        result.migratedChats++;
        console.log(`Migrated chat: ${chat.id}`);
      } catch (error) {
        const errorMsg = `Failed to migrate chat ${chat.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        result.errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    result.success = result.errors.length === 0;
    console.log(`Migration completed: ${result.migratedChats} chats, ${result.migratedSnapshots} snapshots`);

    return result;
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    result.errors.push(errorMsg);
    console.error(errorMsg);

    return result;
  }
}

/**
 * Check if migration is needed (IndexedDB has data but Supabase is empty)
 */
export async function isMigrationNeeded(): Promise<boolean> {
  try {
    // Check if Supabase is available
    const isSupabaseAvailable = await supabaseChatClient.isConnected();

    if (!isSupabaseAvailable) {
      return false;
    }

    // Check if IndexedDB has data
    const db = await openDatabase();

    if (!db) {
      return false;
    }

    const indexedDBChats = await getAll(db);

    if (indexedDBChats.length === 0) {
      return false;
    }

    // Check if Supabase has data
    const supabaseChats = await supabaseChatClient.getAll();

    // If IndexedDB has data but Supabase is empty, migration is needed
    return indexedDBChats.length > 0 && supabaseChats.length === 0;
  } catch (error) {
    console.error('Error checking migration status:', error);
    return false;
  }
}

/**
 * Clear all data from IndexedDB (use with caution!)
 */
export async function clearIndexedDBData(): Promise<void> {
  try {
    const db = await openDatabase();

    if (!db) {
      throw new Error('IndexedDB is not available');
    }

    // Clear chats
    const chatsTransaction = db.transaction(['chats'], 'readwrite');
    const chatsStore = chatsTransaction.objectStore('chats');
    await new Promise<void>((resolve, reject) => {
      const request = chatsStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Clear snapshots
    const snapshotsTransaction = db.transaction(['snapshots'], 'readwrite');
    const snapshotsStore = snapshotsTransaction.objectStore('snapshots');
    await new Promise<void>((resolve, reject) => {
      const request = snapshotsStore.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('IndexedDB data cleared successfully');
  } catch (error) {
    console.error('Failed to clear IndexedDB data:', error);
    throw error;
  }
}
