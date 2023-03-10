import express from 'express';
import bodyParser from 'body-parser';
import http from 'http';
import cors from 'cors';
import { existsSync, mkdirSync } from 'fs';
import { RequestContext } from '@mikro-orm/core';

import { getDataPath, url } from './utils';
import { orm } from './orm';
import { FILE_TYPES } from './consts';

import { router } from './api';

const app = express();
const server = http.createServer(app);

// setup file structure
[...FILE_TYPES, 'vtt'].forEach((type) => {
  const path = getDataPath(type);
  if (!existsSync(path)) mkdirSync(path);

  app.use(`/${type}`, cors(), express.static(path));
});

app.use((_, __, next) => {
  RequestContext.create(orm.em, next);
});

app.use((req, _, next) => {
  (req as any).start = Date.now();
  next();
});

app.use(bodyParser.json());
app.use(cors());

app.use('/v1', router);

server.listen(process.env['PORT'] || 3312, () => {
  console.log(`Simpsons API ready at ${url()}`);
});
