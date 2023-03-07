export const SNIPPET_FILE_TYPES = ['mp4', 'gif', 'webm'] as const;
export const SNAP_FILE_TYPES = ['jpg'] as const;

export const FILE_TYPES = [...SNIPPET_FILE_TYPES, ...SNAP_FILE_TYPES] as const;

export const MIN_TERM_LENGTH = 5;
export const MAX_EPISODE_MATCH_LIMIT = 50;
export const MAX_SUBTITLE_LENGTH = 100;
export const MAX_SNIPPET_DURATION = 60000; // ms
