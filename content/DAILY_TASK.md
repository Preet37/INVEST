# Daily lesson task for Invest

You are writing today's lessons for Invest, Preet's personal learning feed. Do this once per run.

## Steps

1. Read `content/sources.json`. Only use sources listed there.
2. Read every file in `content/lessons/` and collect the `itemUrl` values already used. Never write a second lesson for an `itemUrl` that exists.
3. For each feed source (types `rss`, `youtube`, `podcast`, `arxiv`), fetch the feed URL and look at items from the last 3 days. For YouTube use the transcript when one is available, otherwise the title and description. For podcasts use the show notes, and a transcript when the show publishes one.
4. For `book` sources, pick one key idea from the book that has no lesson yet.
5. Pick the best items and write **about 15 lessons** in total. Balance them:
   - Roughly even across finance, psychology and business.
   - Count the existing lessons per subtopic (list below). Subtopics with the fewest lessons go first.
   - Prefer items with a concrete story, number or case in them.
6. Write the file `content/lessons/YYYY-MM-DD.json` (today's date) in the format below.
7. Run `npm run content:check`. Fix anything it reports.
8. Commit only that file with the message `Lessons for YYYY-MM-DD` and push to the default branch.

If a feed fails to load, skip it and carry on. If nothing new is found anywhere, write lessons from the book shelf instead. Never leave a day empty.

## Topics and subtopics (use these ids exactly)

- `finance`: `reading-charts`, `great-investors`, `personal-finance`, `markets-economy`, `psychology-of-money`
- `psychology`: `understanding-behavior`, `connecting-with-people`, `biases-decisions`, `habits-motivation`, `persuasion`
- `business`: `starting-a-company`, `innovation`, `leading-teams`, `strategy`, `sales-marketing`
- `communication`: `speaking`, `writing`, `negotiation`, `storytelling`
- `science`: `ai`, `how-things-work`, `health-body`, `big-ideas`
- `history`: `economic-history`, `leaders`, `inventions`, `turning-points`

## File format

```json
{
  "date": "YYYY-MM-DD",
  "lessons": [
    {
      "sourceId": "id from sources.json",
      "itemUrl": "the original item's URL. For books: book:<source-id>/<short-idea-name>",
      "itemTitle": "title of the original article, video, paper or book chapter",
      "publishedAt": "ISO date of the original, if known (optional)",
      "excerpt": "one or two sentences summarising the original, in your own words (optional, max 600 characters)",
      "sourceTitle": "what to show as the source, for example: The Psychology of Money, Morgan Housel",
      "sourceUrl": "link to the original, or null for books",
      "title": "short lesson title, under 8 words",
      "topic": "finance",
      "subtopic": "psychology-of-money",
      "difficulty": 1,
      "concepts": ["two to four lowercase concept tags, reused across lessons where they fit"],
      "cards": [
        { "type": "hook", "text": "One surprising line or question." },
        { "type": "idea", "text": "The idea in plain words, with an everyday example." },
        { "type": "example", "text": "A real story, number or case from the source." },
        { "type": "use", "text": "How this shows up in his life, money, work or conversations." },
        { "type": "say", "text": "A two-sentence version he could repeat to a friend." }
      ],
      "word": { "word": "one strong vocabulary word from the lesson", "meaning": "plain meaning", "example": "an example sentence" },
      "quiz": { "question": "one question that checks the main idea", "choices": ["three", "plausible", "choices"], "answer": 0 },
      "tutorQuestion": "optional: a question the tutor asks him at the end"
    }
  ]
}
```

`difficulty` is 1 (new to this), 2 (knows the basics) or 3 (pretty deep). `word` and `tutorQuestion` are optional. `quiz.answer` is the position of the right choice, starting at 0. Mix up where the right answer sits.

## Writing rules (strict)

- Exactly 5 cards, in the order hook, idea, example, use, say.
- At most 40 words per card.
- No em dashes anywhere. Write like a person talks.
- No jargon without a plain explanation in the same card.
- No made-up statistics, quotes or stories. Use only facts that are in the source, and name the source. If you are not sure a number is in the source, leave it out.
- Summarise and teach. Never copy full articles. Always keep the link to the original.
- Lessons about investors and their methods cite real books, letters or interviews. No invented quotes.
- No personal buy or sell advice.
- The reader is 20, technical, and wants plain language with concrete everyday examples first.
