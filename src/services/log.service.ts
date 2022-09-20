import type { Response } from 'express';
import { Log } from '../entities';
import { orm } from '../orm';

interface ViewAllOptions {
  filter?: string;
  page: number;
  perpage?: number;
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

  viewAll({ filter, page, perpage = 10 }: ViewAllOptions) {
    if (perpage > 50) perpage = 50;
    return orm.em
      .getRepository(Log)
      .findAndCount(filter ? { requestPath: { $like: `%${filter}%` } } : {}, {
        limit: perpage,
        offset: (page - 1) * perpage,
        orderBy: { createdAt: 'DESC' },
      });
  },
};
