import { readdirSync } from 'fs';
import { Episode, Subtitle } from '../entities';
import { orm } from '../orm';
import { getDataPath } from '../utils';

const FILE_TYPES = ['jpg', 'mp4', 'gif'];

export const statsService = {
  async getAll() {
    const episodeRepository = orm.em.getRepository(Episode);
    const subtitleRepository = orm.em.getRepository(Subtitle);

    return {
      episodes_indexed: await episodeRepository.count(),
      subtitles_indexed: await subtitleRepository.count(),
      ...FILE_TYPES.reduce(
        (prev, type) => ({
          ...prev,
          [`${type}s_generated`]: readdirSync(getDataPath(type)).length,
        }),
        {}
      ),
    };
  },
};
