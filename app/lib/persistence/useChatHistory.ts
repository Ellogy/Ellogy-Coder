import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import {
  getMessages,
  getNextId,
  getUrlId,
  openDatabase,
  setMessages,
  duplicateChat,
  createChatFromMessages,
  getSnapshot,
  setSnapshot,
  type IChatMetadata,
} from './db';
import { supabaseChatClient } from './supabaseClient';
import { FORCE_SUPABASE_ONLY, DISABLE_INDEXEDDB } from './supabaseConfig';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { webcontainer } from '~/lib/webcontainer';
import { detectProjectCommands, createCommandActionsString } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

// Désactiver IndexedDB si FORCE_SUPABASE_ONLY est activé
export const db = persistenceEnabled && !DISABLE_INDEXEDDB ? await openDatabase() : undefined;

// Function to check if Supabase is available and connected
const isSupabaseAvailable = async (): Promise<boolean> => {
  // Si FORCE_SUPABASE_ONLY est activé, toujours essayer Supabase
  if (FORCE_SUPABASE_ONLY) {
    try {
      return await supabaseChatClient.isConnected();
    } catch (error) {
      console.log('Supabase not available, but FORCE_SUPABASE_ONLY is enabled:', error);

      // Même si Supabase n'est pas connecté, on force l'utilisation
      return true;
    }
  }

  try {
    return await supabaseChatClient.isConnected();
  } catch (error) {
    console.log('Supabase not available:', error);
    return false;
  }
};

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);
export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [initialMessages, setInitialMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    const loadChat = async () => {
      if (!mixedId) {
        setReady(true);
        return;
      }

      try {
        // Si FORCE_SUPABASE_ONLY est activé, utiliser uniquement Supabase
        if (FORCE_SUPABASE_ONLY) {
          console.log('FORCE_SUPABASE_ONLY: Loading chat from Supabase only');

          const [storedMessages, snapshot] = await Promise.all([
            supabaseChatClient.getMessages(mixedId),
            supabaseChatClient.getSnapshot(mixedId),
          ]);

          await processChatData(storedMessages, snapshot);
        } else {
          // Mode normal avec fallback
          const supabaseAvailable = await isSupabaseAvailable();

          if (supabaseAvailable) {
            const [storedMessages, snapshot] = await Promise.all([
              supabaseChatClient.getMessages(mixedId),
              supabaseChatClient.getSnapshot(mixedId),
            ]);

            await processChatData(storedMessages, snapshot);
          } else if (db) {
            // Fallback to IndexedDB
            const [storedMessages, snapshot] = await Promise.all([getMessages(db, mixedId), getSnapshot(db, mixedId)]);

            await processChatData(storedMessages, snapshot);
          } else {
            if (persistenceEnabled) {
              const error = new Error('Chat persistence is unavailable');
              logStore.logError('Chat persistence initialization failed', error);
              toast.error('Chat persistence is unavailable');
            }

            setReady(true);

            return;
          }
        }
      } catch (error) {
        console.error('Failed to load chat:', error);
        logStore.logError('Failed to load chat messages or snapshot', error);
        toast.error('Failed to load chat: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setReady(true);
      }
    };

    const processChatData = async (storedMessages: any, snapshot: any) => {
      if (storedMessages && storedMessages.messages.length > 0) {
        const validSnapshot = snapshot || { chatIndex: '', files: {} }; // Ensure snapshot is not undefined
        const summary = validSnapshot.summary;

        const rewindId = searchParams.get('rewindTo');
        let startingIdx = -1;
        const endingIdx = rewindId
          ? storedMessages.messages.findIndex((m: any) => m.id === rewindId) + 1
          : storedMessages.messages.length;
        const snapshotIndex = storedMessages.messages.findIndex((m: any) => m.id === validSnapshot.chatIndex);

        if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
          startingIdx = snapshotIndex;
        }

        if (snapshotIndex > 0 && storedMessages.messages[snapshotIndex].id == rewindId) {
          startingIdx = -1;
        }

        let filteredMessages = storedMessages.messages.slice(startingIdx + 1, endingIdx);
        let archivedMessages: Message[] = [];

        if (startingIdx >= 0) {
          archivedMessages = storedMessages.messages.slice(0, startingIdx + 1);
        }

        setArchivedMessages(archivedMessages);

        if (startingIdx > 0) {
          const files = Object.entries(validSnapshot?.files || {})
            .map(([key, value]: [string, any]) => {
              if (value?.type !== 'file') {
                return null;
              }

              return {
                content: value.content,
                path: key,
              };
            })
            .filter((x): x is { content: string; path: string } => !!x); // Type assertion
          const projectCommands = await detectProjectCommands(files);

          // Call the modified function to get only the command actions string
          const commandActionsString = createCommandActionsString(projectCommands);

          filteredMessages = [
            {
              id: generateId(),
              role: 'user',
              content: `Restore project from snapshot`, // Removed newline
              annotations: ['no-store', 'hidden'],
            },
            {
              id: storedMessages.messages[snapshotIndex].id,
              role: 'assistant',

              // Combine followup message and the artifact with files and command actions
              content: `Ellogy-Coder Restored your chat from a snapshot. You can revert this message to load the full chat history.
              <boltArtifact id="restored-project-setup" title="Restored Project & Setup" type="bundled">
              ${Object.entries(snapshot?.files || {})
                .map(([key, value]: [string, any]) => {
                  if (value?.type === 'file') {
                    return `
                  <boltAction type="file" filePath="${key}">
${value.content}
                  </boltAction>
                  `;
                  } else {
                    return ``;
                  }
                })
                .join('\n')}
              ${commandActionsString}
              </boltArtifact>
              `, // Added commandActionsString, followupMessage, updated id and title
              annotations: [
                'no-store',
                ...(summary
                  ? [
                      {
                        chatId: storedMessages.messages[snapshotIndex].id,
                        type: 'chatSummary',
                        summary,
                      } satisfies ContextAnnotation,
                    ]
                  : []),
              ],
            },
            ...filteredMessages,
          ];

          if (mixedId) {
            restoreSnapshot(mixedId);
          }
        }

        setInitialMessages(filteredMessages);

        setUrlId(storedMessages.urlId);
        description.set(storedMessages.description);
        chatId.set(storedMessages.id);
        chatMetadata.set(storedMessages.metadata);
      } else {
        navigate('/', { replace: true });
      }

      setReady(true);
    };

    loadChat();
  }, [mixedId, db, navigate, searchParams]);

  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string) => {
      const id = chatId.get();

      if (!id) {
        return;
      }

      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
      };

      try {
        // Si FORCE_SUPABASE_ONLY est activé, utiliser uniquement Supabase
        if (FORCE_SUPABASE_ONLY) {
          console.log('FORCE_SUPABASE_ONLY: Saving snapshot to Supabase only');

          try {
            await supabaseChatClient.setSnapshot(id, snapshot);
            console.log('Snapshot saved to Supabase successfully');
          } catch (supabaseError) {
            console.error('Supabase snapshot save failed:', supabaseError);

            // Si Supabase échoue et qu'on a IndexedDB, utiliser IndexedDB comme fallback
            if (db) {
              console.log('Falling back to IndexedDB for snapshot due to Supabase failure');

              try {
                await setSnapshot(db, id, snapshot);
                console.log('Snapshot saved to IndexedDB as fallback');
              } catch (indexedDBError) {
                console.error('IndexedDB fallback also failed:', indexedDBError);

                // Ne pas lancer l'erreur, juste logger
                console.warn('Both Supabase and IndexedDB failed, snapshot not saved');
              }
            } else {
              console.warn('Supabase failed and no IndexedDB available, snapshot not saved');
            }
          }
        } else {
          // Mode normal avec fallback
          const supabaseAvailable = await isSupabaseAvailable();

          if (supabaseAvailable) {
            await supabaseChatClient.setSnapshot(id, snapshot);
          } else if (db) {
            // Fallback to IndexedDB
            await setSnapshot(db, id, snapshot);
          } else {
            throw new Error('No persistence method available');
          }
        }
      } catch (error) {
        console.error('Failed to save snapshot:', error);
        toast.error('Failed to save chat snapshot.');
      }
    },
    [db],
  );

  const restoreSnapshot = useCallback(async (id: string, snapshot?: Snapshot) => {
    // const snapshotStr = localStorage.getItem(`snapshot:${id}`); // Remove localStorage usage
    const container = await webcontainer;

    const validSnapshot = snapshot || { chatIndex: '', files: {} };

    if (!validSnapshot?.files) {
      return;
    }

    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    });
    Object.entries(validSnapshot.files).forEach(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }

        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      } else {
      }
    });

    // workbenchStore.files.setKey(snapshot?.files)
  }, []);

  return {
    ready: !mixedId || ready,
    initialMessages,
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();

      if (!id) {
        return;
      }

      try {
        // Try Supabase first if available
        const supabaseAvailable = await isSupabaseAvailable();

        if (supabaseAvailable) {
          await supabaseChatClient.setMessages(id, initialMessages, urlId, description.get(), undefined, metadata);
        } else if (db) {
          // Fallback to IndexedDB
          await setMessages(db, id, initialMessages, urlId, description.get(), undefined, metadata);
        } else {
          throw new Error('No persistence method available');
        }

        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messages: Message[]) => {
      if (messages.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;
      messages = messages.filter((m) => !m.annotations?.includes('no-store'));

      let _urlId = urlId;

      if (!urlId && firstArtifact?.id) {
        try {
          // Try Supabase first if available
          const supabaseAvailable = await isSupabaseAvailable();

          if (supabaseAvailable) {
            const urlId = await supabaseChatClient.getUrlId(firstArtifact.id);
            _urlId = urlId;
          } else if (db) {
            // Fallback to IndexedDB
            const urlId = await getUrlId(db, firstArtifact.id);
            _urlId = urlId;
          }

          if (_urlId) {
            navigateChat(_urlId);
            setUrlId(_urlId);
          }
        } catch (error) {
          console.error('Failed to get URL ID:', error);
        }
      }

      // Si pas d'URL ID, utiliser l'ID du chat comme URL ID
      if (!_urlId) {
        // Si le chatId est déjà défini (par exemple, avec un ticketId), l'utiliser comme urlId
        const currentChatId = chatId.get();

        if (currentChatId) {
          _urlId = currentChatId;
          navigateChat(currentChatId);
          setUrlId(currentChatId);
          console.log('Using existing chatId as urlId:', currentChatId);
        } else {
          // L'ID du chat sera défini plus tard, on l'utilisera alors
          console.log('URL ID will be set to chat ID when chat is created');
        }
      }

      let chatSummary: string | undefined = undefined;
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.role === 'assistant') {
        const annotations = lastMessage.annotations as JSONValue[];
        const filteredAnnotations = (annotations?.filter(
          (annotation: JSONValue) =>
            annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
        ) || []) as { type: string; value: any } & { [key: string]: any }[];

        // Chercher le summary dans les annotations
        const summaryAnnotation = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary');

        if (summaryAnnotation) {
          chatSummary = summaryAnnotation.summary || summaryAnnotation.value;
          console.log('Found chat summary:', chatSummary);
        }

        // Si pas de summary dans les annotations, essayer d'extraire du contenu du message
        if (!chatSummary && lastMessage.content) {
          // Essayer d'extraire un résumé du contenu du message
          const content = lastMessage.content;

          if (content.length > 100) {
            chatSummary = content.substring(0, 200) + '...';
            console.log('Generated summary from content:', chatSummary);
          }
        }
      }

      takeSnapshot(messages[messages.length - 1].id, workbenchStore.files.get(), _urlId, chatSummary);

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      // Ensure chatId.get() is used here as well
      if (initialMessages.length === 0 && !chatId.get()) {
        try {
          // Try Supabase first if available
          const supabaseAvailable = await isSupabaseAvailable();

          let nextId: string;

          if (supabaseAvailable) {
            console.log('Using Supabase for new chat creation');
            nextId = await supabaseChatClient.getNextId();
          } else if (db) {
            console.log('Using IndexedDB for new chat creation');

            // Fallback to IndexedDB
            nextId = await getNextId(db);
          } else {
            console.log('No persistence method available, using fallback ID generation');

            // Ultimate fallback - generate ID manually
            nextId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }

          chatId.set(nextId);

          if (!_urlId) {
            navigateChat(nextId);
            setUrlId(nextId);
          }
        } catch (error) {
          console.error('Failed to get next ID:', error);

          // Don't show error toast immediately, try fallback
          console.log('Trying fallback ID generation');

          const fallbackId = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          chatId.set(fallbackId);

          if (!_urlId) {
            navigateChat(fallbackId);
            setUrlId(fallbackId);
          }
        }
      } else if (chatId.get() && !_urlId) {
        // Si le chatId est déjà défini (par exemple, avec un ticketId) mais pas d'urlId, utiliser le chatId
        const currentChatId = chatId.get();

        if (currentChatId) {
          _urlId = currentChatId;
          navigateChat(currentChatId);
          setUrlId(currentChatId);
          console.log('Using existing chatId as urlId (from ticket):', currentChatId);
        }
      }

      // Ensure chatId.get() is used for the final setMessages call
      const finalChatId = chatId.get();

      if (!finalChatId) {
        console.error('Cannot save messages, chat ID is not set.');
        toast.error('Failed to save chat messages: Chat ID missing.');

        return;
      }

      try {
        // Si FORCE_SUPABASE_ONLY est activé, utiliser uniquement Supabase
        if (FORCE_SUPABASE_ONLY) {
          console.log('FORCE_SUPABASE_ONLY: Saving messages to Supabase only');

          try {
            await supabaseChatClient.setMessages(
              finalChatId,
              [...archivedMessages, ...messages],
              finalChatId, // Utiliser l'ID du chat comme URL ID
              description.get(),
              undefined,
              chatMetadata.get(),
            );
            console.log('Messages saved to Supabase successfully');
          } catch (supabaseError) {
            console.error('Supabase save failed:', supabaseError);

            // Si Supabase échoue et qu'on a IndexedDB, utiliser IndexedDB comme fallback
            if (db) {
              console.log('Falling back to IndexedDB due to Supabase failure');

              try {
                await setMessages(
                  db,
                  finalChatId,
                  [...archivedMessages, ...messages],
                  finalChatId, // Utiliser l'ID du chat comme URL ID
                  description.get(),
                  undefined,
                  chatMetadata.get(),
                );
                console.log('Messages saved to IndexedDB as fallback');
              } catch (indexedDBError) {
                console.error('IndexedDB fallback also failed:', indexedDBError);

                // Ne pas lancer l'erreur, juste logger
                console.warn('Both Supabase and IndexedDB failed, messages not saved');
              }
            } else {
              console.warn('Supabase failed and no IndexedDB available, messages not saved');
            }
          }
        } else {
          // Mode normal avec fallback
          const supabaseAvailable = await isSupabaseAvailable();

          if (supabaseAvailable) {
            console.log('Saving messages to Supabase');
            await supabaseChatClient.setMessages(
              finalChatId,
              [...archivedMessages, ...messages],
              finalChatId, // Utiliser l'ID du chat comme URL ID
              description.get(),
              undefined,
              chatMetadata.get(),
            );
            console.log('Messages saved to Supabase successfully');
          } else if (db) {
            console.log('Saving messages to IndexedDB');

            // Fallback to IndexedDB
            await setMessages(
              db,
              finalChatId,
              [...archivedMessages, ...messages],
              finalChatId, // Utiliser l'ID du chat comme URL ID
              description.get(),
              undefined,
              chatMetadata.get(),
            );
            console.log('Messages saved to IndexedDB successfully');
          } else {
            console.log('No persistence method available, messages will not be saved');

            // Don't throw error, just log warning
            console.warn('No persistence method available - messages not saved');
          }
        }
      } catch (error) {
        console.error('Failed to save messages:', error);

        // Only show toast if it's a critical error
        if (error instanceof Error && error.message.includes('No persistence method available')) {
          console.warn('No persistence available, continuing without saving');
        } else {
          toast.error('Failed to save chat messages');
        }
      }
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!mixedId && !listItemId) {
        return;
      }

      try {
        // Try Supabase first if available
        const supabaseAvailable = await isSupabaseAvailable();

        let newId: string;

        if (supabaseAvailable) {
          newId = await supabaseChatClient.duplicateChat(mixedId || listItemId);
        } else if (db) {
          // Fallback to IndexedDB
          newId = await duplicateChat(db, mixedId || listItemId);
        } else {
          throw new Error('No persistence method available');
        }

        navigate(`/coder/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      try {
        // Try Supabase first if available
        const supabaseAvailable = await isSupabaseAvailable();

        let newId: string;

        if (supabaseAvailable) {
          newId = await supabaseChatClient.createChatFromMessages(description, messages, metadata);
        } else if (db) {
          // Fallback to IndexedDB
          newId = await createChatFromMessages(db, description, messages, metadata);
        } else {
          throw new Error('No persistence method available');
        }

        window.location.href = `/coder/chat/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = urlId) => {
      if (!id) {
        return;
      }

      try {
        // Try Supabase first if available
        const supabaseAvailable = await isSupabaseAvailable();

        let chat: any;

        if (supabaseAvailable) {
          chat = await supabaseChatClient.getMessages(id);
        } else if (db) {
          // Fallback to IndexedDB
          chat = await getMessages(db, id);
        } else {
          throw new Error('No persistence method available');
        }

        const chatData = {
          messages: chat.messages,
          description: chat.description,
          exportDate: new Date().toISOString(),
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-${new Date().toISOString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Failed to export chat:', error);
        toast.error('Failed to export chat');
      }
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/coder/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
