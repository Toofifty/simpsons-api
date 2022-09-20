import type { Response } from 'express';
import { Log } from '../entities';
import { orm } from '../orm';

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
      success: status < 400,
      responseTime,
      renderTime,
    });

    logRepository.persistAndFlush(log);
  },

  view(page: number, perpage: number = 10) {
    if (perpage > 50) perpage = 50;
    return orm.em
      .getRepository(Log)
      .findAndCount(
        {},
        {
          limit: perpage,
          offset: (page - 1) * perpage,
          orderBy: { createdAt: 'DESC' },
        }
      );
  },
};
