import { openDB } from 'idb';

const DB_NAME = 'latrocore_files';
const STORE_NAME = 'attachments';
const DB_VERSION = 1;

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    },
  });
}

export async function saveFile(id, file, metadata = {}) {
  const db = await getDB();
  const buffer = await file.arrayBuffer();
  await db.put(STORE_NAME, {
    id,
    name: file.name,
    type: file.type,
    size: file.size,
    data: buffer,
    ...metadata,
    savedAt: new Date().toISOString(),
  });
  return id;
}

export async function getFile(id) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

export async function deleteFile(id) {
  const db = await getDB();
  return db.delete(STORE_NAME, id);
}

export async function listFiles(prefix = '') {
  const db = await getDB();
  const all = await db.getAll(STORE_NAME);
  if (prefix) return all.filter(f => f.id.startsWith(prefix));
  return all;
}

export function createFileUrl(fileData) {
  if (!fileData || !fileData.data) return null;
  const blob = new Blob([fileData.data], { type: fileData.type });
  return URL.createObjectURL(blob);
}

export function revokeFileUrl(url) {
  if (url) URL.revokeObjectURL(url);
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

export function validateFile(file) {
  if (!file) return { valid: false, error: 'No file selected' };
  if (file.size > MAX_FILE_SIZE) return { valid: false, error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB.` };
  if (!ALLOWED_TYPES.includes(file.type)) return { valid: false, error: `Invalid file type. Allowed: PDF, JPEG, PNG, WebP.` };
  return { valid: true, error: null };
}
