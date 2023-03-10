import type {
  FilterQuery,
  FindOneOptions,
  Loaded,
  RequiredEntityData,
} from '@mikro-orm/core';
import { EntityRepository } from '@mikro-orm/mysql';
import type { Snippet } from '../entities';

export class SnippetRepository extends EntityRepository<Snippet> {
  async upsert<P extends string = never>(
    where: FilterQuery<Snippet>,
    data: RequiredEntityData<Snippet>,
    options?: FindOneOptions<Snippet, P>
  ): Promise<Loaded<Snippet, P>> {
    let entity = await this.findOne(where, options);

    if (!entity) {
      entity = this.create(data) as Loaded<Snippet, P>;
    } else {
      this.assign(entity, data);
    }

    await this.persistAndFlush(entity);

    return entity;
  }
}
