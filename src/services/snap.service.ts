import { existsSync, promises } from 'fs';
import { SNAP_FILE_TYPES } from '../consts';
import { getDataPath, url } from '../utils';
import { ffmpegService } from './ffmpeg.service';

interface GenerateSnapOptions {
  seasonId: number;
  episodeInSeason: number;
  time: string;
  filetype?: typeof SNAP_FILE_TYPES[number];
}

export const snapService = {
  async generate({
    seasonId,
    episodeInSeason,
    time,
    filetype = 'jpg',
  }: GenerateSnapOptions) {
    if (!SNAP_FILE_TYPES.includes(filetype)) {
      throw `Snap file type not supported: ${filetype}`;
    }

    const filename = this.getName(seasonId, episodeInSeason, time, filetype);

    if (!existsSync(getDataPath(filetype, filename))) {
      const sources = await promises.readdir(getDataPath('source'));
      const episodeRegex = new RegExp(`S0?${seasonId}E0?${episodeInSeason}`);
      const source = sources.find((source) => episodeRegex.test(source));

      if (!source) return 'unavailable';

      await ffmpegService.saveSnap({
        source,
        offset: time,
        output: getDataPath(filetype, filename),
      });
    }

    return url(`snaps/${filename}`);
  },

  getName(
    seasonId: number,
    episodeInSeason: number,
    time: string,
    filetype: string
  ) {
    return `s${seasonId}e${episodeInSeason}t${time.replace(
      /\W/g,
      '_'
    )}.${filetype}`;
  },
};
