import { EntityRepository } from '@mikro-orm/mysql';
import type { Subtitle } from '../entities';

interface FindMatchedSubtitlesOptions {
  episodeId: number;
  beginIndex: number;
  endIndex: number;
}

export class SubtitleRepository extends EntityRepository<Subtitle> {
  async findMatchedSubtitles({
    episodeId,
    beginIndex,
    endIndex,
  }: FindMatchedSubtitlesOptions) {
    return this.find({
      episode: episodeId,
      $or: [
        {
          $and: [
            { indexBegin: { $lte: beginIndex } },
            { indexEnd: { $gt: beginIndex } },
          ],
        },
        {
          $and: [
            { indexBegin: { $gte: beginIndex } },
            { indexEnd: { $lte: endIndex } },
          ],
        },
        {
          $and: [
            { indexBegin: { $lt: endIndex } },
            { indexEnd: { $gte: endIndex } },
          ],
        },
      ],
    });
  }

  async findNext({ minId, limit }: { minId: number; limit: number }) {
    return this.find({ id: { $gt: minId } }, { orderBy: { id: 'asc' }, limit });
  }

  async findPrevious({ maxId, limit }: { maxId: number; limit: number }) {
    return this.find(
      { id: { $lt: maxId } },
      { orderBy: { id: 'desc' }, limit }
    );
  }
}
