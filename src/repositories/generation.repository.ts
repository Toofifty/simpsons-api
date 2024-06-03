import { EntityRepository } from '@mikro-orm/mysql';
import type { Generation } from '../entities';
import type {
  FilterQuery,
  FindOneOptions,
  Loaded,
  RequiredEntityData,
} from '@mikro-orm/core';

export class GenerationRepository extends EntityRepository<Generation> {
  async upsert<P extends string = never>(
    where: FilterQuery<Generation>,
    data: RequiredEntityData<Generation>,
    options?: FindOneOptions<Generation, P>
  ): Promise<Loaded<Generation, P>> {
    let entity = await this.findOne(where, options);

    if (!entity) {
      entity = this.create(data) as Loaded<Generation, P>;
    } else {
      this.assign(entity, data);
    }

    await this.persistAndFlush(entity);

    return entity;
  }
}
