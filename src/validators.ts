import { z } from 'zod';

const toNumber = (value: unknown) =>
  value === undefined ? undefined : Number(value);

export default {
  snippets: {
    findAll: z.object({
      sort_by: z.enum(['views', 'created_at', 'episode_id']).optional(),
      order: z.enum(['asc', 'desc']).optional(),
      offset: z.preprocess(toNumber, z.number().positive().optional()),
      limit: z.preprocess(toNumber, z.number().positive().max(100).optional()),
      filter_by: z
        .object({
          episode: z.preprocess(toNumber, z.number().optional()),
        })
        .optional(),
    }),
  },
  logs: {
    findAll: z.object({
      filter: z.string().optional(),
      offset: z.preprocess(toNumber, z.number().positive().optional()),
      limit: z.preprocess(toNumber, z.number().positive().max(50).optional()),
    }),
  },
};
