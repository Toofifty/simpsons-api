import { Episode } from '../entities';
import { orm } from '../orm';

const MAX_CORRECTION = 600;

export const episodeService = {
  viewAll: async () => {
    return orm.em
      .getRepository(Episode)
      .findAll({ fields: ['id', 'idInSeason', 'title', 'subtitleCorrection'] });
  },

  makeCorrection: async (id: number, correction: number) => {
    if (isNaN(correction)) {
      throw 'Invalid correction';
    }

    if (correction < -MAX_CORRECTION || correction > MAX_CORRECTION) {
      throw `Correction must be between -${MAX_CORRECTION}s and ${MAX_CORRECTION}s`;
    }

    const episodeRepository = orm.em.getRepository(Episode);
    const episode = await episodeRepository.findOneOrFail(id);

    episode.subtitleCorrection = correction;
    await episodeRepository.persistAndFlush(episode);
  },
};
