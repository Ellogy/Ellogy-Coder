import { createClient } from '@supabase/supabase-js';
import { supabaseConnection } from '~/lib/stores/supabase';
import { profileStore } from '~/lib/stores/profile';
import { SUPABASE_CONFIG, FORCE_SUPABASE_ONLY } from './supabaseConfig';
import type { Message } from 'ai';
import type { IChatMetadata } from './db';
import type { Snapshot } from './types';

export interface SupabaseChat {
  id: string;
  user_id: string;
  url_id?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
  created_at: string;
  updated_at: string;
}

export interface SupabaseSnapshot {
  chat_id: string;
  chat_index: string;
  files: Record<string, any>;
  summary?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

class SupabaseChatClient {
  private _client: any = null;
  private _isInitialized = false;

  private async _initializeClient() {
    if (this._isInitialized && this._client) {
      return this._client;
    }

    // Si FORCE_SUPABASE_ONLY est activé, utiliser la configuration directe
    if (FORCE_SUPABASE_ONLY) {
      // Priorité 1: Variables d'environnement (.env)
      if (SUPABASE_CONFIG.anonKey) {
        console.log('Using Supabase config from environment variables');
        this._client = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
      } else {
        // Priorité 2: Credentials de connexion
        const connection = supabaseConnection.get();

        if (connection.credentials?.anonKey && connection.credentials?.supabaseUrl) {
          console.log('Using Supabase config from connection');
          this._client = createClient(connection.credentials.supabaseUrl, connection.credentials.anonKey);
        } else {
          throw new Error(
            'Supabase credentials not available. Please configure VITE_SUPABASE_ANON_KEY in .env or connect to Supabase first.',
          );
        }
      }
    } else {
      // Mode normal avec vérification de connexion
      const connection = supabaseConnection.get();

      if (!connection.credentials?.anonKey || !connection.credentials?.supabaseUrl) {
        throw new Error('Supabase credentials not available. Please connect to Supabase first.');
      }

      this._client = createClient(connection.credentials.supabaseUrl, connection.credentials.anonKey);
    }

    this._isInitialized = true;

    return this._client;
  }

  async getAll(): Promise<ChatHistoryItem[]> {
    const client = await this._initializeClient();
    const userId = this._getUserId();

    const { data, error } = await client
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch chats: ${error.message}`);
    }

    return data.map((chat: SupabaseChat) => ({
      id: chat.id,
      urlId: chat.url_id,
      description: chat.description,
      messages: chat.messages,
      timestamp: chat.timestamp,
      metadata: chat.metadata,
    }));
  }

  async getMessages(id: string): Promise<ChatHistoryItem> {
    const client = await this._initializeClient();
    const userId = this._getUserId();

    const { data, error } = await client.from('chats').select('*').eq('id', id).eq('user_id', userId).single();

    if (error) {
      throw new Error(`Failed to fetch chat: ${error.message}`);
    }

    if (!data) {
      throw new Error('Chat not found');
    }

    return {
      id: data.id,
      urlId: data.url_id,
      description: data.description,
      messages: data.messages,
      timestamp: data.timestamp,
      metadata: data.metadata,
    };
  }

  async setMessages(
    id: string,
    messages: Message[],
    urlId?: string,
    description?: string,
    timestamp?: string,
    metadata?: IChatMetadata,
  ): Promise<void> {
    const client = await this._initializeClient();
    const userId = this._getUserId();

    const chatData = {
      id,
      user_id: userId,
      url_id: urlId,
      description,
      messages,
      timestamp: timestamp || new Date().toISOString(),
      metadata,
    };

    const { error } = await client.from('chats').upsert(chatData);

    if (error) {
      throw new Error(`Failed to save chat: ${error.message}`);
    }
  }

  async getSnapshot(chatId: string): Promise<Snapshot | null> {
    const client = await this._initializeClient();

    const { data, error } = await client.from('snapshots').select('*').eq('chat_id', chatId).single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No snapshot found
        return null;
      }

      throw new Error(`Failed to fetch snapshot: ${error.message}`);
    }

    return {
      chatIndex: data.chat_index,
      files: data.files,
      summary: data.summary,
    };
  }

  async setSnapshot(chatId: string, snapshot: Snapshot): Promise<void> {
    const client = await this._initializeClient();

    const snapshotData = {
      chat_id: chatId,
      chat_index: snapshot.chatIndex,
      files: snapshot.files,
      summary: snapshot.summary,
    };

    const { error } = await client.from('snapshots').upsert(snapshotData);

    if (error) {
      throw new Error(`Failed to save snapshot: ${error.message}`);
    }
  }

  async getNextId(): Promise<string> {
    // Generate a unique ID (you can use your existing ID generation logic)
    return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getUrlId(artifactId: string): Promise<string> {
    /*
     * For now, return the artifact ID as URL ID
     * You can implement more sophisticated URL ID generation if needed
     */
    return artifactId;
  }

  async duplicateChat(originalId: string): Promise<string> {
    const originalChat = await this.getMessages(originalId);
    const newId = await this.getNextId();

    await this.setMessages(
      newId,
      originalChat.messages,
      originalChat.urlId,
      `${originalChat.description} (Copy)`,
      undefined,
      originalChat.metadata,
    );

    // Also duplicate snapshot if it exists
    const snapshot = await this.getSnapshot(originalId);

    if (snapshot) {
      await this.setSnapshot(newId, snapshot);
    }

    return newId;
  }

  async createChatFromMessages(description: string, messages: Message[], metadata?: IChatMetadata): Promise<string> {
    const newId = await this.getNextId();

    await this.setMessages(newId, messages, undefined, description, undefined, metadata);

    return newId;
  }

  async deleteChat(id: string): Promise<void> {
    const client = await this._initializeClient();

    // Delete snapshot first
    await client.from('snapshots').delete().eq('chat_id', id);

    // Delete chat
    const { error } = await client.from('chats').delete().eq('id', id);

    if (error) {
      throw new Error(`Failed to delete chat: ${error.message}`);
    }
  }

  private _getUserId(): string {
    try {
      // Récupérer l'ID utilisateur depuis le profileStore
      const profile = profileStore.get();

      if (profile?.id) {
        return profile.id;
      }

      // Fallback: essayer localStorage si profileStore n'a pas d'ID
      const userData = localStorage.getItem('user');

      if (userData) {
        const user = JSON.parse(userData);
        return user.id || 'anonymous-user';
      }

      return 'anonymous-user';
    } catch {
      return 'anonymous-user';
    }
  }

  async getAllChatsByUserId(userId: string): Promise<ChatHistoryItem[]> {
    const client = await this._initializeClient();

    const { data, error } = await client
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch chats for user: ${error.message}`);
    }

    return data.map((chat: SupabaseChat) => ({
      id: chat.id,
      urlId: chat.url_id,
      description: chat.description,
      messages: chat.messages,
      timestamp: chat.timestamp,
      metadata: chat.metadata,
    }));
  }

  async getChatById(chatId: string): Promise<ChatHistoryItem> {
    const client = await this._initializeClient();
    const userId = this._getUserId();

    const { data, error } = await client.from('chats').select('*').eq('id', chatId).eq('user_id', userId).single();

    if (error) {
      throw new Error(`Failed to fetch chat by ID: ${error.message}`);
    }

    if (!data) {
      throw new Error('Chat not found');
    }

    return {
      id: data.id,
      urlId: data.url_id,
      description: data.description,
      messages: data.messages,
      timestamp: data.timestamp,
      metadata: data.metadata,
    };
  }

  async isConnected(): Promise<boolean> {
    try {
      const connection = supabaseConnection.get();
      return !!(connection.credentials?.anonKey && connection.credentials?.supabaseUrl);
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const supabaseChatClient = new SupabaseChatClient();
