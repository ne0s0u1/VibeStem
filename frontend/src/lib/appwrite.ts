import { Client, Account, Databases, Storage, Query, ID, Permission, Role } from 'appwrite';
import { APPWRITE_CONFIG } from './config';

const client = new Client();
client
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { Query, ID, Permission, Role };
export default client;