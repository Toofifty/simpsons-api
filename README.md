# Simpsons Gif Generator API

"The Simpsons" quote API and gif generator.

[simpsons-api.matho.me](https://simpsons-api.matho.me/gif?term=ohyoubetterbelievethatsapaddlin)

## API

### `/quote`

Identify a quote (and surrounding subtitles) matching the search criteria. Supports seasons 1-29.

| Option | Required | Default | Description |
| :--- | :---: | --- | --- |
| `term` | ✅ | | Text-based search term. See [Search term index](#Search_term_index). |
| `season` |  | All | Refine search by season. Quote API supports seasons 1-29. |
| `episode` | | All | Refine search by absolute episode number. e.g. `250` is S12E03 "Insane Clown Poppy" |
| `seasonEpisode` | | All | Refine search by relative episode number in its season (beginning at 1). |
| `padding` | | `5` | Amount of extra subtitles to return before and after the matched quote. |
| `snap` | | `false` | Return a screenshot from the beginning of the matched quote. |

### `/gif`

Generate a gif of the quote matching the search criteria. Supports seasons 1-19.

| Option | Required | Default | Description |
| :--- | :---: | --- | --- |
| `term` | ✅ (or `begin` & `end`) | | Text-based search term. See [Search term index](#Search_term_index). |
| `begin` | ✅ (or `term`) | | Integer ID of the first subtitle to include. |
| `end` | ✅ (or `term`) | | Integer ID of the last subtitle to include. |
| `offset` | | 0 | Time in seconds to offset the subtitles. Positive numbers will begin the gif later, negative will begin the gif sooner. |
| `extend` | | 0 | Additional time to extend the gif past the duration of the subtitles. |
| `render` | | `false` | Immediately return gif file. Otherwise, will return a link to the static gif. |

## Search term index

Episode subtitles are indexed by removing all punctuation and spaces, then by combining all subtitles in an episode into one database column to be used as the index. Because of this, there is no need to add punctuation or spaces to search terms. 

The term [`get ready, everybody. He`](`https://simpsons-api.matho.me/gif?term=get%20ready,%20everybody.%20He`) is equivalent to [`getreadyeverybodyhe`](https://simpsons-api.matho.me/gif?term=getreadyeverybodyhe).

![getreadyeverybodyhe](https://simpsons-api.matho.me/gifs/b104705e104706.gif)

Gaps can also be specified by adding `[...]` between search terms. This allows for searching across multiple different subtitles without having to specify quotes perfectly.

[`alongthelinesof[...]makehomer[...]dontmind`](https://simpsons-api.matho.me/gif?term=alongthelinesof%5B...%5Dmakehomer%5B...%5Ddontmind)

![alongthelinesof[...]makehomer[...]dontmind](https://simpsons-api.matho.me/gifs/b51637e51640.gif)