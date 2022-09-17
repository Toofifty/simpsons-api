import { existsSync, readdirSync } from 'fs';
import { getDataPath, url } from '../utils';
import { ffmpegService } from './ffmpeg.service';

interface GenerateSnapOptions {
  seasonId: number;
  episodeInSeason: number;
  time: string;
}

export const snapService = {
  async generate({ seasonId, episodeInSeason, time }: GenerateSnapOptions) {
    const filename = this.getName(seasonId, episodeInSeason, time);

    if (!existsSync(getDataPath('snaps', filename))) {
      const sources = readdirSync(getDataPath('source'));
      const episodeRegex = new RegExp(`S0?${seasonId}E0?${episodeInSeason}`);
      const source = sources.find((source) => episodeRegex.test(source));

      if (!source) return 'unavailable';

      await ffmpegService.saveSnap({
        source,
        offset: time,
        output: filename,
      });
    }

    return url(`snaps/${filename}`);
  },

  getName(seasonId: number, episodeInSeason: number, time: string) {
    return `s${seasonId}e${episodeInSeason}t${time.replace(/\W/g, '_')}.jpg`;
  },
};
