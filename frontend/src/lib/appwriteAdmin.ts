/**
 * appwriteAdmin.ts
 * 使用 Appwrite API Key 进行特权操作（只在管理后台使用）
 * ⚠️  API Key 会打包进前端 bundle，仅限内部管理工具使用。
 *     建议在 Appwrite 控制台将 API Key 的作用域限制为：
 *     users.read, databases.read, databases.write
 */

import { APPWRITE_CONFIG } from './config';

const API_KEY = import.meta.env.VITE_APPWRITE_API_KEY as string;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? 'GET').toUpperCase();
  const baseHeaders: Record<string, string> = {
    'X-Appwrite-Project': APPWRITE_CONFIG.projectId,
    'X-Appwrite-Key': API_KEY,
  };
  // GET 请求不带 body，不加 Content-Type；POST/PATCH/PUT 才需要
  if (method !== 'GET' && method !== 'HEAD') {
    baseHeaders['Content-Type'] = 'application/json';
  }
  const res = await fetch(`${APPWRITE_CONFIG.endpoint}${path}`, {
    ...init,
    headers: { ...baseHeaders, ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (text) {
      try {
        const err = JSON.parse(text) as { message?: string };
        throw new Error(err.message ?? `HTTP ${res.status}`);
      } catch {
        throw new Error(text || `HTTP ${res.status}`);
      }
    }
    throw new Error(res.statusText || `HTTP ${res.status}`);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  const text = await res.text().catch(() => '');
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

// ─────────────────────────── Types ────────────────────────────

export interface AdminUser {
  $id: string;
  name: string;
  email: string;
  $createdAt: string;
  labels: string[];
  status: boolean;
}

export interface StyleDoc {
  $id: string;
  label: string;
  color: string;
  sub: string[];
  order: number;
}

export interface TrackDoc {
  $id: string;
  ownerId: string;
  source?: 'generated' | 'separated';
  title?: string;
  name?: string;
  fileId?: string;
  bucketId?: string;
  originalFileId?: string;
  stemVocalsId?: string;
  stemDrumsId?: string;
  stemBassId?: string;
  stemOtherId?: string;
  tags?: string[];
  model?: string;
  imageUrl?: string;
  $createdAt: string;
  isDeleted?: boolean;
}

// ─────────────────────────── Users API ────────────────────────

export async function listUsers(search?: string): Promise<AdminUser[]> {
  // Users API 使用 limit/search 而非 queries[]
  const params = new URLSearchParams({ limit: '100' });
  if (search) params.set('search', search);
  const res = await apiFetch<{ users: AdminUser[] }>(`/users?${params}`);
  return res.users;
}

/** 给用户打 admin label（Appwrite labels 字段） */
export async function setUserLabel(userId: string, labels: string[]): Promise<void> {
  await apiFetch(`/users/${userId}/labels`, {
    method: 'PUT',
    body: JSON.stringify({ labels }),
  });
}

// ─────────────────────────── Tracks API ───────────────────────

export async function listTracksByUser(
  ownerId: string
): Promise<{ generated: TrackDoc[]; separated: TrackDoc[] }> {
  const dbId = APPWRITE_CONFIG.databaseId;
  const colId = APPWRITE_CONFIG.tracksCollectionId;

  // 当前项目环境下 documents 的 queries[] 在 REST 端点会触发 400 Syntax error，
  // 这里改为无 query 拉取后在客户端过滤。
  const res = await apiFetch<{ documents: TrackDoc[] }>(
    `/databases/${dbId}/collections/${colId}/documents`
  );

  const filtered = res.documents
    .filter(d => d.ownerId === ownerId && d.isDeleted !== true)
    .sort((a, b) => +new Date(b.$createdAt) - +new Date(a.$createdAt))
    .slice(0, 200);

  const generated = filtered.filter(d => d.source === 'generated');
  const separated = filtered.filter(d => d.source !== 'generated');
  return { generated, separated };
}

export async function listTracks(): Promise<TrackDoc[]> {
  const dbId = APPWRITE_CONFIG.databaseId;
  const colId = APPWRITE_CONFIG.tracksCollectionId;
  const res = await apiFetch<{ documents: TrackDoc[] }>(
    `/databases/${dbId}/collections/${colId}/documents`
  );
  return res.documents
    .filter(d => d.isDeleted !== true)
    .sort((a, b) => +new Date(b.$createdAt) - +new Date(a.$createdAt));
}

export async function fetchFileBlobUrl(bucketId: string, fileId: string): Promise<string> {
  const res = await fetch(
    `${APPWRITE_CONFIG.endpoint}/storage/buckets/${bucketId}/files/${fileId}/download`,
    {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': APPWRITE_CONFIG.projectId,
        'X-Appwrite-Key': API_KEY,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

// ─────────────────────────── Styles API ───────────────────────

export async function listStyles(): Promise<StyleDoc[]> {
  // 当前项目环境下 documents 的 queries[] 在 REST 端点会触发 400 Syntax error，
  // 这里改为无 query 拉取并在客户端排序与截断。
  const res = await apiFetch<{ documents: StyleDoc[] }>(
    `/databases/${APPWRITE_CONFIG.databaseId}/collections/${APPWRITE_CONFIG.stylesCollectionId}/documents`
  );
  return res.documents
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .slice(0, 100);
}

export async function createStyle(
  data: Omit<StyleDoc, '$id'>
): Promise<StyleDoc> {
  return apiFetch<StyleDoc>(
    `/databases/${APPWRITE_CONFIG.databaseId}/collections/${APPWRITE_CONFIG.stylesCollectionId}/documents`,
    {
      method: 'POST',
      body: JSON.stringify({
        documentId: 'unique()',
        data,
        permissions: [],
      }),
    }
  );
}

export async function updateStyle(
  id: string,
  data: Partial<Omit<StyleDoc, '$id'>>
): Promise<StyleDoc> {
  return apiFetch<StyleDoc>(
    `/databases/${APPWRITE_CONFIG.databaseId}/collections/${APPWRITE_CONFIG.stylesCollectionId}/documents/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ data }),
    }
  );
}

export async function deleteStyle(id: string): Promise<void> {
  await apiFetch(
    `/databases/${APPWRITE_CONFIG.databaseId}/collections/${APPWRITE_CONFIG.stylesCollectionId}/documents/${id}`,
    { method: 'DELETE' }
  );
}
