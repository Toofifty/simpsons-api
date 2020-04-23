import express from "express";
import http from "http";
import cors from "cors";
import { error } from "./error";
import { findQuote } from "./find-quote";
import { findStats } from "stats";

const app = express();
const server = http.createServer(app);

app.use(cors());

server.listen(process.env.PORT || 3312, () => {
  console.log("Simpsons API ready");
});

app.get("/", async (req, res) => {
  res.send({
    status: 200,
    data: await findStats(),
  });
});

app.get("/quote", async (req, res) => {
  if (!req.query.term) {
    return res.send(error("`term` field is required"));
  }
  return res.send({
    status: 200,
    data: await findQuote({
      term: req.query.term.toString(),
      season: req.query.season
        ? Number(req.query.season.toString())
        : undefined,
      episode: req.query.episode
        ? Number(req.query.episode.toString())
        : undefined,
      seasonEpisode: req.query.season_episode
        ? Number(req.query.season_episode.toString())
        : undefined,
      padding: req.query.padding
        ? Number(req.query.padding.toString())
        : undefined,
    }),
  });
});
