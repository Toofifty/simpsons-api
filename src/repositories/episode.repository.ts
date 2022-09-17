import { EntityRepository } from '@mikro-orm/mysql';
import type { Episode } from '../entities';

interface SearchEpisodeOptions {
  term: string;
  match: number;
  season?: number;
  episode?: number;
  seasonEpisode?: number;
}

export class EpisodeRepository extends EntityRepository<Episode> {
  async search({
    term,
    season,
    seasonEpisode,
    episode,
    match,
  }: SearchEpisodeOptions) {
    return this.findAndCount(
      { subtitleIndex: { $like: `%${term}%` } },
      {
        filters: {
          seasonId: season ? { seasonId: season } : false,
          idInSeason: seasonEpisode ? { idInSeason: seasonEpisode } : false,
          id: episode ? { id: episode } : false,
        },
        limit: 1,
        offset: match,
        populate: ['season'],
      }
    );
  }
}