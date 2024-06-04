import { promises } from 'fs';
import { FILE_TYPES } from '../consts';
import { Episode } from '../entities';
import { orm } from '../orm';
import { getDataPath } from '../utils';

const MAX_CORRECTION = 600;

export const episodeService = {
  findAll: async () => {
    return orm.em
      .getRepository(Episode)
      .findAll({ fields: ['id', 'idInSeason', 'title', 'subtitleCorrection'] });
  },

  makeCorrection: async (id: number, correction: number) => {
    if (isNaN(correction)) {
      throw 'Invalid correction';
    }

    if (
      correction < -(MAX_CORRECTION * 1000) ||
      correction > MAX_CORRECTION * 1000
    ) {
      throw `Correction must be between -${MAX_CORRECTION}s and ${MAX_CORRECTION}s`;
    }

    const episodeRepository = orm.em.getRepository(Episode);
    const episode = await episodeRepository.findOneOrFail(id);

    episode.subtitleCorrection = correction;
    await episodeRepository.persistAndFlush(episode);

    // TODO: apply correction to all snippets of the episode
  },

  purgeSnippets: async (id: number) => {
    const episodeRepository = orm.em.getRepository(Episode);
    const episode = await episodeRepository.findOneOrFail(id);

    await Promise.all(
      FILE_TYPES.map(async (filetype) => {
        const dirpath = getDataPath(filetype, episode.identifier);
        await promises.rm(dirpath, { recursive: true, force: true });
      })
    );
  },
};
