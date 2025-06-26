import { openDB } from "idb";
import { HEADERS } from "../types";

export const DB_NAME = "ChatGPTStore";
export const STORE_NAME = "SavedQueries";
export const DB_VERSION = 1;

// Open the IndexedDB database
async function openDatabase() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });

        for (const key of HEADERS) {
          store.createIndex(key, key, { unique: key === "OID" });
        }
      }
    },
  });
}

// Save or update one record by OID
export async function saveOrUpdate(payload: { [key: string]: any }) {
  if (!payload.OID) {
    throw new Error("Payload must have an 'OID' field.");
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const oidIndex = store.index("OID");

    const existing = await oidIndex.get(payload.OID);

    const fullPayload: any = existing ? { ...existing } : {};

    for (const key of HEADERS) {
      if (key in payload) {
        fullPayload[key] = payload[key];
      }
    }

    await store.put(fullPayload);

    await tx.done;
  } catch (error) {
    console.error("Error saving/updating entry in IndexedDB:", error);
    throw new Error(
      `Error saving/updating entry in IndexedDB: ${
        error instanceof Error ? error.message : error
      }`
    );
  }
}

// Save or update multiple rows (bulk)
export async function createTableAndSaveData(dataObjects: any[]) {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const oidIndex = store.index("OID");

  for (const row of dataObjects) {
    const fullRow: any = {};

    for (const key of HEADERS) {
      fullRow[key] = key in row ? row[key] : "";
    }
    let existing;
    if (fullRow?.OID) {
      existing = await oidIndex.get(fullRow?.OID);
    }

    if (existing) {
      await store.put({ ...existing, ...fullRow });
    } else {
      await store.put(fullRow);
    }
  }

  await tx.done;
}

// Get all rows sorted by timestamp
// export async function getAllFromIndexedDB(): Promise<any[]> {
//   try {
//     const db = await openDatabase();
//     const tx = db.transaction(STORE_NAME, "readonly");
//     const store = tx.objectStore(STORE_NAME);
//     const allItems = await store.getAll();
//     return allItems.sort((a, b) => a.timestamp - b.timestamp);
//   } catch (error) {
//     console.error("Error reading from IndexedDB:", error);
//     throw error;
//   }
// }

export async function doesIndexedDBExist(dbName: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName);

    let existed = true;

    request.onupgradeneeded = () => {
      // This event only fires if DB didn't exist before
      existed = false;
    };

    request.onsuccess = () => {
      request.result.close();
      if (!existed) {
        // Delete it immediately because we don't want to create it just to check
        indexedDB.deleteDatabase(dbName);
      }
      resolve(existed);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAllFromIndexedDB(): Promise<any[]> {
  const dbExists = await doesIndexedDBExist(DB_NAME);
  if (!dbExists) {
    console.warn("IndexedDB not found. Returning empty data.");
    return [];
  }

  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const allItems = await store.getAll();
    return allItems.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.error("Error reading from IndexedDB:", error);
    throw error;
  }
}
