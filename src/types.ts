import type { FILE_TYPES } from './consts';

export interface SnippetOptions {
  begin: number;
  end: number;
  offset?: number;
  extend?: number;
  subtitles?: boolean;
  filetype?: 'gif' | 'mp4' | 'webm';
  resolution?: number;
}
