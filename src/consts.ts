export const SNIPPET_FILE_TYPES = ['mp4', 'gif', 'webm'] as const;
export const SNAP_FILE_TYPES = ['jpg', 'webp'] as const;

export const DEFAULT_IMAGE_SCALE = '480x360';
export const THUMBNAIL_SCALE = '120x90';

export const FILE_TYPES = [...SNIPPET_FILE_TYPES, ...SNAP_FILE_TYPES] as const;

export const MIN_TERM_LENGTH = 5;
export const DEFAULT_SUBTITLE_MATCH_LIMIT = 5;
export const MAX_SUBTITLE_MATCH_LIMIT = 100;
export const MAX_SUBTITLE_LENGTH = 200;
export const MAX_SNIPPET_DURATION = 120_000; // ms
