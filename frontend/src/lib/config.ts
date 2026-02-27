export const APPWRITE_CONFIG = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT as string,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID as string,
  databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID as string,
  tracksCollectionId: import.meta.env.VITE_APPWRITE_TRACKS_COLLECTION_ID as string,
  tasksCollectionId: import.meta.env.VITE_APPWRITE_TASKS_COLLECTION_ID as string,
  uploadsBucketId: import.meta.env.VITE_APPWRITE_UPLOADS_BUCKET_ID as string,
  stemsBucketId: import.meta.env.VITE_APPWRITE_STEMS_BUCKET_ID as string,
  generatedBucketId: import.meta.env.VITE_APPWRITE_GENERATED_BUCKET_ID as string,
};

// baseUrl 应指向 Cloudflare Worker URL，不包含任何密钥
export const SUNO_CONFIG = {
  baseUrl: import.meta.env.VITE_SUNO_WORKER_URL as string,
};

export const DEMUCS_CONFIG = {
  baseUrl: import.meta.env.VITE_DEMUCS_API_BASE_URL as string,
};