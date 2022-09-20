import ffmpeg from 'fluent-ffmpeg';

import { getDataPath } from '../utils';

interface SaveGifOptions {
  source: string;
  offset: number;
  duration: number;
  subtitlePath?: string;
  output: string;
}

interface SaveSnapOptions {
  source: string;
  offset: string;
  output: string;
}

export const ffmpegService = {
  saveSnippet({
    source,
    duration,
    offset,
    subtitlePath,
    output,
  }: SaveGifOptions) {
    return new Promise<number>((res, rej) => {
      const start = Date.now();
      ffmpeg(getDataPath('source', source))
        .seekInput(offset)
        .duration(duration)
        .on('end', () => res(Date.now() - start))
        .on('error', rej)
        .videoFilters([
          'fps=24',
          'scale=720:-1:flags=lanczos',
          ...(subtitlePath
            ? [`subtitles=${subtitlePath}:force_style='FontSize=24'`]
            : []),
        ])
        .save(output);
    });
  },

  saveSnap({ source, offset, output }: SaveSnapOptions) {
    return new Promise<number>((res, rej) => {
      const start = Date.now();
      ffmpeg(getDataPath('source', source))
        .seekInput(offset)
        .takeFrames(1)
        .on('end', () => res(Date.now() - start))
        .on('error', rej)
        .save(output);
    });
  },
};
