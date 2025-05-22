import { openDB } from 'idb';

const DB_NAME = 'ChatGPTStore';
const STORE_NAME = 'SavedQueries';
const DB_VERSION = 1;

async function openDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });

        store.createIndex('chatId', 'chatId', { unique: true });
      }
    },
  });
}

export async function saveOrUpdate(payload: { chatId: string | number; [key: string]: any }) {
  if (!payload.chatId) {
    throw new Error("Payload must have a 'chatId' field.");
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const existing = await store.index('chatId').get(payload.chatId);  
    

    if (existing) {
      const updatedPayload = { ...existing, ...payload };
      await store.put(updatedPayload);
    } else {
      await store.put(payload);
    }

    await tx.done;
  } catch (error) {
    console.error("Error saving/updating entry in IndexedDB:", error);
    throw new Error(`Error saving/updating entry in IndexedDB: ${error instanceof Error ? error.message : error}`);
  }
}

export async function getAllFromIndexedDB(): Promise<any[]> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const allItems = await store.getAll();
    return allItems.sort((a, b) => a.createdAt - b.createdAt);
  } catch (error) {
    console.error("Error reading from IndexedDB:", error);
    throw error;
  }
}