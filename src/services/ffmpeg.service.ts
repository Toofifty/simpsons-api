import ffmpeg from 'fluent-ffmpeg';

import { getDataPath } from '../utils';

interface SaveGifOptions {
  source: string;
  offset: number;
  duration: number;
  subtitlePath: string;
  output: string;
}

interface SaveSnapOptions {
  source: string;
  offset: string;
  output: string;
}

export const ffmpegService = {
  saveGif({ source, duration, offset, subtitlePath, output }: SaveGifOptions) {
    return new Promise((res, rej) => {
      ffmpeg(getDataPath('source', source))
        .seekInput(offset)
        .duration(duration)
        .on('end', res)
        .on('error', rej)
        .videoFilters([
          'fps=15',
          'scale=640:-1:flags=lanczos',
          `subtitles=${subtitlePath}:force_style='FontSize=24'`,
        ])
        .save(getDataPath('gifs', output));
    });
  },

  saveSnap({ source, offset, output }: SaveSnapOptions) {
    return new Promise((res, rej) => {
      ffmpeg(getDataPath('source', source))
        .seekInput(offset)
        .takeFrames(1)
        .on('end', res)
        .on('error', rej)
        .save(getDataPath('snaps', output));
    });
  },
};
