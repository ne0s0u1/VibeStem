import { Client, Account, Databases, Storage, Query, ID, Permission, Role } from 'appwrite';
import { APPWRITE_CONFIG } from './config';

const client = new Client();

const endpoint = APPWRITE_CONFIG.endpoint;
const projectId = APPWRITE_CONFIG.projectId;

if (!endpoint || !projectId || endpoint.includes('你的') || projectId.includes('你的')) {
  console.error(
    '[EDMVibe] Appwrite 配置缺失！请在 frontend/.env 中填写 VITE_APPWRITE_ENDPOINT 和 VITE_APPWRITE_PROJECT_ID 等变量。\n参考 .env.example 文件。'
  );
} else {
  client.setEndpoint(endpoint).setProject(projectId);
}

export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

export { Query, ID, Permission, Role };
export default client;