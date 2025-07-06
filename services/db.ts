import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { Restaurant } from '../types/restaurants';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
const getDb = () =>
  dbPromise ?? (dbPromise = SQLite.openDatabaseAsync('restos.db'));

/* ───────────────────────── init ───────────────────────── */
export const init = async () => {
  const db = await getDb();

  // table principale
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      address TEXT,
      notes TEXT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      createdAt TEXT NOT NULL
    );
  `);

  // table des photos
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS restaurant_images (
      id TEXT PRIMARY KEY NOT NULL,
      restaurantId TEXT NOT NULL,
      uri TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (restaurantId) REFERENCES restaurants(id) ON DELETE CASCADE
    );
  `);
};

/* ───────────────────────── CRUD resto ───────────────────────── */
type NewRestaurant = Omit<Restaurant, 'createdAt'> & { id?: string };

export const insertRestaurant = async (r: NewRestaurant): Promise<string> => {
  const db = await getDb();
  const id = r.id ?? Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO restaurants
       (id, name, address, notes, lat, lng, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    id,
    r.name,
    r.address ?? null,
    r.notes ?? null,
    r.lat,
    r.lng,
    new Date().toISOString()
  );
  return id;
};

export const fetchRestaurants = async (): Promise<Restaurant[]> => {
  const db = await getDb();
  return db.getAllAsync<Restaurant>(
    'SELECT * FROM restaurants ORDER BY createdAt DESC;'
  );
};

export const deleteRestaurant = async (id: string) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM restaurants WHERE id = ?;', id);
};

/* ───────────────────────── CRUD images ───────────────────────── */
export const insertImage = async (restaurantId: string, uri: string) => {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO restaurant_images (id, restaurantId, uri, createdAt)
     VALUES (?, ?, ?, ?)`,
    Crypto.randomUUID(),
    restaurantId,
    uri,
    new Date().toISOString()
  );
};

export const fetchImages = async (
  restaurantId: string
): Promise<string[]> => {
  const db = await getDb();
  const rows = await db.getAllAsync<{ uri: string }>(
    'SELECT uri FROM restaurant_images WHERE restaurantId = ?',
    restaurantId
  );
  return rows.map(r => r.uri);
};
