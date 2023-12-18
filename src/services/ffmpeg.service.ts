import ffmpeg from 'fluent-ffmpeg';

import { getDataPath } from '../utils';
import { DEFAULT_IMAGE_SCALE } from '../consts';

interface SaveGifOptions {
  source: string;
  offset: number;
  duration: number;
  subtitlePath?: string;
  output: string;
  resolution: number;
}

interface SaveSnapOptions {
  source: string;
  offset: number;
  output: string;
  scale?: string;
}

export const ffmpegService = {
  saveSnippet({
    source,
    duration,
    offset,
    subtitlePath,
    output,
    resolution,
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
          `scale=${resolution}:-1:flags=lanczos`,
          ...(subtitlePath
            ? [`subtitles=${subtitlePath}:force_style='FontSize=24'`]
            : []),
        ])
        .outputOptions(['-movflags +faststart', '-strict -2'])
        .save(output);
    });
  },

  saveSnap({
    source,
    offset,
    output,
    scale = DEFAULT_IMAGE_SCALE,
  }: SaveSnapOptions) {
    return new Promise<number>((res, rej) => {
      const start = Date.now();
      ffmpeg(getDataPath('source', source))
        .seekInput(offset)
        .takeFrames(1)
        .on('end', () => res(Date.now() - start))
        .on('error', rej)
        .videoFilters([`scale=${scale}`])
        .save(output);
    });
  },
};
