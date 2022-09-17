import { readdirSync } from 'fs';
import { Episode, Subtitle } from '../entities';
import { orm } from '../orm';
import { getDataPath } from '../utils';

export const statsService = {
  async getAll() {
    const episodeRepository = orm.em.getRepository(Episode);
    const subtitleRepository = orm.em.getRepository(Subtitle);

    return {
      episodes_indexed: await episodeRepository.count(),
      subtitles_indexed: await subtitleRepository.count(),
      episodes_available: readdirSync(getDataPath('source')).length,
      gifs_generated: readdirSync(getDataPath('gifs')).length,
      snaps_generated: readdirSync(getDataPath('snaps')).length,
    };
  },
};
