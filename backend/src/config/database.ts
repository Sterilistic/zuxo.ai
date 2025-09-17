import { MongoClient, ServerApiVersion, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

// MongoDB connection URI
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error('MONGODB_URI environment variable is not set');
}

// Create MongoDB client
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1
});

let database: Db | null = null;

/**
 * Connect to MongoDB database
 */
export async function connectDB(): Promise<void> {
  try {
    await client.connect();
    database = client.db('page_saver');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    throw error;
  }
}

/**
 * Get the database instance
 */
export function getDatabase(): Db {
  if (!database) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  return database;
}

/**
 * Close database connection
 */
export async function closeDB(): Promise<void> {
  try {
    await client.close();
    database = null;
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error);
    throw error;
  }
}

/**
 * Check if database is connected
 */
export function isConnected(): boolean {
  return database !== null;
}
