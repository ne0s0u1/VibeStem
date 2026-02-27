import { SUNO_CONFIG } from './config';
import type { SunoTrack } from '../types';

export type { SunoTrack };

// String literal union of status codes (used as state in components)
export type SunoTaskStatus =
  | 'PENDING'
  | 'TEXT_SUCCESS'
  | 'FIRST_SUCCESS'
  | 'SUCCESS'
  | 'CREATE_TASK_FAILED'
  | 'GENERATE_AUDIO_FAILED'
  | 'CALLBACK_EXCEPTION'
  | 'SENSITIVE_WORD_ERROR';

// Full task result from API
export interface SunoTaskResult {
  taskId: string;
  status: SunoTaskStatus;
  tracks?: SunoTrack[];
}

export interface SunoGenerateParams {
  model: 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5';
  prompt: string;
  style?: string;
  title?: string;
  customMode?: boolean;
  instrumental?: boolean;
  negativeTags?: string;
  vocalGender?: 'm' | 'f' | '';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  personaId?: string;
}


const JSON_HEADERS = { 'Content-Type': 'application/json' };

export async function generateMusic(params: SunoGenerateParams): Promise<string> {
  console.log('[suno] generateMusic 请求参数:', params);
  const res = await fetch(`${SUNO_CONFIG.baseUrl}/suno/generate`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      model: params.model,
      prompt: params.prompt,
      style: params.style ?? '',
      title: params.title ?? '',
      customMode: params.customMode ?? false,
      instrumental: params.instrumental ?? false,
      negativeTags: params.negativeTags ?? '',
      vocalGender: params.vocalGender ?? '',
      styleWeight: params.styleWeight,
      weirdnessConstraint: params.weirdnessConstraint,
      audioWeight: params.audioWeight,
      personaId: params.personaId,
      callBackUrl: `${SUNO_CONFIG.baseUrl}/suno/callback`,
    }),
  });
  console.log('[suno] generateMusic HTTP status:', res.status);
  if (!res.ok) {
    const errText = await res.text();
    console.error('[suno] generateMusic 失败:', res.status, errText);
    throw new Error(`Suno API error: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const taskId = data.data?.taskId ?? data.taskId;
  console.log('[suno] 任务已创建 taskId:', taskId, '完整响应:', data);
  return taskId;
}

export async function getTaskStatus(taskId: string): Promise<SunoTaskResult> {
  const res = await fetch(`${SUNO_CONFIG.baseUrl}/suno/status?taskId=${encodeURIComponent(taskId)}`, {
    headers: JSON_HEADERS,
  });
  if (!res.ok) {
    const errText = await res.text();
    console.error('[suno] getTaskStatus 失败:', res.status, errText);
    throw new Error(`Suno status error: ${res.status} ${errText}`);
  }
  const data = await res.json();
  const record = data.data ?? data;
  console.log(`[suno] 轮询状态 taskId=${taskId} status=${record.status} 原始响应:`, data);
  return {
    taskId,
    status: record.status as SunoTaskStatus,
    // 正确路径： data.response.sunoData（文档结构）
    tracks: (record.response?.sunoData ?? record.sunoData)?.map((t: SunoTrack) => ({
      id: t.id,
      title: t.title,
      audioUrl: t.audioUrl,
      imageUrl: t.imageUrl,
      tags: t.tags,
      prompt: t.prompt,
      model: t.model,
      duration: t.duration,
    })),
  };
}

export async function pollTaskUntilDone(
  taskId: string,
  onStatus?: (statusCode: SunoTaskStatus) => void,
  intervalMs = 4000,
  maxWaitMs = 600_000
): Promise<SunoTrack[]> {
  const start = Date.now();
  const terminal = new Set<SunoTaskStatus>(['SUCCESS', 'CREATE_TASK_FAILED', 'GENERATE_AUDIO_FAILED', 'CALLBACK_EXCEPTION', 'SENSITIVE_WORD_ERROR']);
  let round = 0;

  console.log(`[suno] 开始轮询 taskId=${taskId} 间隔=${intervalMs}ms 超时=${maxWaitMs / 1000}s`);

  while (Date.now() - start < maxWaitMs) {
    round++;
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const result = await getTaskStatus(taskId);
    console.log(`[suno] 轮询 #${round} +${elapsed}s → ${result.status}`);
    onStatus?.(result.status);
    if (terminal.has(result.status)) {
      if (result.status !== 'SUCCESS') {
        console.error(`[suno] 生成失败: ${result.status}`);
        throw new Error(`Generation failed: ${result.status}`);
      }
      console.log(`[suno] 生成成功！共 ${result.tracks?.length ?? 0} 首曲`, result.tracks);
      return result.tracks ?? [];
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  console.error(`[suno] 超时，轮询了 ${round} 次`);
  throw new Error('Timed out waiting for Suno generation');
}