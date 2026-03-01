export enum ErrorCode {
  SELECTION_EMPTY = 'SELECTION_EMPTY',
  SELECTION_IN_IFRAME = 'SELECTION_IN_IFRAME',
  ANCHOR_FAILED = 'ANCHOR_FAILED',
  REANCHOR_FAILED = 'REANCHOR_FAILED',
  STORAGE_ERROR = 'STORAGE_ERROR',
  EXPORT_ERROR = 'EXPORT_ERROR',
  SYNC_AUTH_FAILED = 'SYNC_AUTH_FAILED',
  SYNC_UPLOAD_FAILED = 'SYNC_UPLOAD_FAILED',
  HIGHLIGHT_API_UNSUPPORTED = 'HIGHLIGHT_API_UNSUPPORTED',
}

export class GlowNoteError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'GlowNoteError';
  }
}
