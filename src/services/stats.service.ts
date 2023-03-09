import { readdirSync } from 'fs';
import { Episode, Subtitle } from '../entities';
import { orm } from '../orm';
import { getDataPath, sum } from '../utils';

const FILE_TYPES = ['jpg', 'mp4', 'gif'];

export const statsService = {
  async getAll() {
    const episodeRepository = orm.em.getRepository(Episode);
    const subtitleRepository = orm.em.getRepository(Subtitle);

    return {
      episodes_indexed: await episodeRepository.count(),
      seasons_indexed: (
        await episodeRepository
          .qb()
          .orderBy({ season: 'desc' })
          .limit(1)
          .execute()
      )[0].season,
      subtitles_indexed: await subtitleRepository.count(),
      ...FILE_TYPES.reduce(
        (prev, type) => ({
          ...prev,
          [`${type}s_generated`]: sum(
            ...readdirSync(getDataPath(type)).flatMap((file) => {
              try {
                return readdirSync(getDataPath(type, file)).length;
              } catch {
                return 1;
              }
            })
          ),
        }),
        {}
      ),
    };
  },
};
