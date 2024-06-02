import type { Response } from 'express';
import { Log } from '../entities';
import { orm } from '../orm';

interface ViewAllOptions {
  filter?: string;
  offset: number;
  limit?: number;
}

export const logService = {
  async logRequest(
    res: Response,
    status: number,
    responseTime: number,
    renderTime?: number
  ) {
    const logRepository = orm.em.getRepository(Log);

    const log = logRepository.create({
      status,
      requestPath: res.req.originalUrl,
      body: res.req.body && JSON.stringify(res.req.body),
      success: status < 400,
      responseTime,
      renderTime,
    });

    logRepository.persistAndFlush(log);
  },

  viewAll({ filter, offset, limit = 10 }: ViewAllOptions) {
    return orm.em
      .getRepository(Log)
      .findAndCount(filter ? { requestPath: { $like: `%${filter}%` } } : {}, {
        limit,
        offset,
        orderBy: { createdAt: 'DESC' },
      });
  },
};
