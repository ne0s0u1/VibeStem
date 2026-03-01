import { Client, Databases, Storage, Query } from 'node-appwrite';

const PAGE_SIZE = Number(process.env.CLEANUP_PAGE_SIZE || 100);
const MAX_DOCS_PER_RUN = Number(process.env.CLEANUP_MAX_DOCS_PER_RUN || 500);
const RETENTION_DAYS = Number(process.env.CLEANUP_RETENTION_DAYS || 30);

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function collectFileRefs(doc, uploadsBucketId, stemsBucketId, generatedBucketId) {
  const refs = [];

  if (doc.source === 'generated') {
    const bucketId = doc.bucketId || generatedBucketId;
    if (doc.fileId) refs.push({ bucketId, fileId: doc.fileId });
    return refs;
  }

  if (doc.originalFileId) {
    refs.push({ bucketId: uploadsBucketId, fileId: doc.originalFileId });
  }
  if (doc.stemVocalsId) {
    refs.push({ bucketId: stemsBucketId, fileId: doc.stemVocalsId });
  }
  if (doc.stemDrumsId) {
    refs.push({ bucketId: stemsBucketId, fileId: doc.stemDrumsId });
  }
  if (doc.stemBassId) {
    refs.push({ bucketId: stemsBucketId, fileId: doc.stemBassId });
  }
  if (doc.stemOtherId) {
    refs.push({ bucketId: stemsBucketId, fileId: doc.stemOtherId });
  }

  if (doc.fileId && doc.bucketId) {
    refs.push({ bucketId: doc.bucketId, fileId: doc.fileId });
  }

  return refs;
}

function dedupeRefs(refs) {
  const seen = new Set();
  return refs.filter((item) => {
    const key = `${item.bucketId}:${item.fileId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function listExpiredDocs(databases, databaseId, tracksCollectionId, cutoffIso) {
  const documents = [];
  let offset = 0;

  while (documents.length < MAX_DOCS_PER_RUN) {
    const remaining = MAX_DOCS_PER_RUN - documents.length;
    const pageLimit = Math.min(PAGE_SIZE, remaining);

    const page = await databases.listDocuments(databaseId, tracksCollectionId, [
      Query.equal('isDeleted', true),
      Query.lessThanEqual('deletedAt', cutoffIso),
      Query.limit(pageLimit),
      Query.offset(offset),
    ]);

    if (!page.documents.length) break;

    documents.push(...page.documents);
    if (page.documents.length < pageLimit) break;
    offset += page.documents.length;
  }

  return documents;
}

async function removeDocumentAndFiles({
  doc,
  databases,
  storage,
  databaseId,
  tracksCollectionId,
  uploadsBucketId,
  stemsBucketId,
  generatedBucketId,
  log,
  error,
}) {
  const refs = dedupeRefs(
    collectFileRefs(doc, uploadsBucketId, stemsBucketId, generatedBucketId)
  );

  let filesDeleted = 0;
  let filesFailed = 0;

  for (const ref of refs) {
    try {
      await storage.deleteFile(ref.bucketId, ref.fileId);
      filesDeleted += 1;
    } catch (e) {
      filesFailed += 1;
      error(`deleteFile failed ${ref.bucketId}/${ref.fileId}: ${e?.message || String(e)}`);
    }
  }

  await databases.deleteDocument(databaseId, tracksCollectionId, doc.$id);
  log(`Deleted document ${doc.$id} with ${filesDeleted} files removed`);

  return { filesDeleted, filesFailed };
}

export default async ({ req, res, log, error }) => {
  try {
    const endpoint = getEnv('APPWRITE_FUNCTION_API_ENDPOINT');
    const projectId = getEnv('APPWRITE_FUNCTION_PROJECT_ID');
    const apiKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_FUNCTION_API_KEY;

    if (!apiKey) {
      throw new Error('Missing function runtime API key');
    }

    const databaseId = getEnv('APPWRITE_DATABASE_ID');
    const tracksCollectionId = getEnv('APPWRITE_TRACKS_COLLECTION_ID');
    const uploadsBucketId = getEnv('APPWRITE_UPLOADS_BUCKET_ID');
    const stemsBucketId = getEnv('APPWRITE_STEMS_BUCKET_ID');
    const generatedBucketId = getEnv('APPWRITE_GENERATED_BUCKET_ID');

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const cutoffIso = cutoff.toISOString();

    const client = new Client()
      .setEndpoint(endpoint)
      .setProject(projectId)
      .setKey(apiKey);

    const databases = new Databases(client);
    const storage = new Storage(client);

    const expiredDocs = await listExpiredDocs(databases, databaseId, tracksCollectionId, cutoffIso);

    let docsDeleted = 0;
    let docsFailed = 0;
    let filesDeleted = 0;
    let filesFailed = 0;

    for (const doc of expiredDocs) {
      try {
        const result = await removeDocumentAndFiles({
          doc,
          databases,
          storage,
          databaseId,
          tracksCollectionId,
          uploadsBucketId,
          stemsBucketId,
          generatedBucketId,
          log,
          error,
        });
        docsDeleted += 1;
        filesDeleted += result.filesDeleted;
        filesFailed += result.filesFailed;
      } catch (e) {
        docsFailed += 1;
        error(`deleteDocument failed ${doc.$id}: ${e?.message || String(e)}`);
      }
    }

    return res.json(
      {
        ok: true,
        trigger: req.headers['x-appwrite-trigger'] || 'http',
        retentionDays: RETENTION_DAYS,
        cutoffIso,
        scanned: expiredDocs.length,
        docsDeleted,
        docsFailed,
        filesDeleted,
        filesFailed,
      },
      200
    );
  } catch (e) {
    error(e?.message || String(e));
    return res.json({ ok: false, message: e?.message || String(e) }, 500);
  }
};
