import type { Models } from 'appwrite';

export interface Track extends Models.Document {
  ownerId: string;
  name: string;
  originalFileId: string;
  stemVocalsId?: string;
  stemDrumsId?: string;
  stemBassId?: string;
  stemOtherId?: string;
  model?: string;
  bpm?: number;
  createdAt: string;
  isDeleted?: boolean;
  deletedAt?: string;
}

// 生成音乐记录（存入 tracks collection，source = "generated"）
export interface GeneratedTrack extends Models.Document {
  ownerId: string;
  source: 'generated';
  title: string;
  fileId: string;       // Appwrite generatedBucket 中的文件 ID
  bucketId: string;     // APPWRITE_CONFIG.generatedBucketId
  duration?: number;
  imageUrl?: string;    // kie.ai 返回的封面图 URL
  tags?: string[];      // kie.ai 返回的风格标签数组（Appwrite String[] 字段）
  isDeleted?: boolean;
  deletedAt?: string;
}

export interface Task extends Models.Document {
  ownerId: string;
  type: 'separate' | 'generate';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  model?: string;
  trackId?: string;
  error?: string;
  createdAt: string;
}

export interface SunoTrack {
  id: string;
  title: string;
  audioUrl: string;
  imageUrl?: string;
  tags?: string;
  prompt?: string;
  model?: string;
  duration?: number;
}