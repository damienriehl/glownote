const FOLDER_NAME = 'GlowNote';
const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

/** Get OAuth token via chrome.identity */
export async function getAuthToken(interactive = false): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (token) {
        resolve(token);
      } else {
        reject(new Error('No token returned'));
      }
    });
  });
}

/** Find or create the GlowNote folder in Drive */
async function ensureFolder(token: string): Promise<string> {
  // Search for existing folder
  const query = `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const searchRes = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await searchRes.json();

  if (searchData.files?.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch(`${DRIVE_API}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });
  const createData = await createRes.json();
  return createData.id;
}

/** Upload or update a markdown file to the GlowNote folder */
export async function uploadMarkdown(
  token: string,
  filename: string,
  content: string
): Promise<string> {
  const folderId = await ensureFolder(token);

  // Check if file already exists
  const query = `name='${filename}' and '${folderId}' in parents and trashed=false`;
  const searchRes = await fetch(`${DRIVE_API}/files?q=${encodeURIComponent(query)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const searchData = await searchRes.json();

  const metadata = {
    name: filename,
    mimeType: 'text/markdown',
    ...(searchData.files?.length > 0 ? {} : { parents: [folderId] }),
  };

  const boundary = '-------glownote_boundary';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/markdown',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const existingId = searchData.files?.[0]?.id;
  const method = existingId ? 'PATCH' : 'POST';
  const url = existingId
    ? `${UPLOAD_API}/files/${existingId}?uploadType=multipart`
    : `${UPLOAD_API}/files?uploadType=multipart`;

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`Drive upload failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.id;
}

/** Generate a safe filename from page title and date */
export function generateFilename(pageTitle: string): string {
  const sanitized = pageTitle
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .slice(0, 60)
    .trim()
    || 'untitled';
  const date = new Date().toISOString().slice(0, 10);
  return `${sanitized}_${date}.md`;
}
