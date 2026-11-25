export type Topic = { id: string; name: string; more?: boolean; subtopics: { id: string; name: string }[] };

export const TOPICS: Topic[] = [
  {
    id: "finance",
    name: "Finance and stocks",
    subtopics: [
      { id: "reading-charts", name: "Reading stock charts" },
      { id: "great-investors", name: "How great investors think" },
      { id: "personal-finance", name: "Personal finance and wealth" },
      { id: "markets-economy", name: "How markets and the economy work" },
      { id: "psychology-of-money", name: "Psychology of money" },
    ],
  },
  {
    id: "psychology",
    name: "Psychology",
    subtopics: [
      { id: "understanding-behavior", name: "Understanding behavior" },
      { id: "connecting-with-people", name: "Connecting with people" },
      { id: "biases-decisions", name: "Thinking traps and decisions" },
      { id: "habits-motivation", name: "Habits and motivation" },
      { id: "persuasion", name: "Persuasion and influence" },
    ],
  },
  {
    id: "business",
    name: "Business and entrepreneurship",
    subtopics: [
      { id: "starting-a-company", name: "Starting a company" },
      { id: "innovation", name: "Innovation" },
      { id: "leading-teams", name: "Leading teams" },
      { id: "strategy", name: "Strategy and competition" },
      { id: "sales-marketing", name: "Sales and marketing" },
    ],
  },
  {
    id: "communication",
    name: "Communication",
    more: true,
    subtopics: [
      { id: "speaking", name: "Speaking clearly" },
      { id: "writing", name: "Writing well" },
      { id: "negotiation", name: "Negotiation" },
      { id: "storytelling", name: "Storytelling" },
    ],
  },
  {
    id: "science",
    name: "Science and technology",
    more: true,
    subtopics: [
      { id: "ai", name: "Artificial intelligence" },
      { id: "how-things-work", name: "How things work" },
      { id: "health-body", name: "Health and the body" },
      { id: "big-ideas", name: "Big ideas in science" },
    ],
  },
  {
    id: "history",
    name: "History",
    more: true,
    subtopics: [
      { id: "economic-history", name: "Money and trade through history" },
      { id: "leaders", name: "Leaders and decisions" },
      { id: "inventions", name: "Inventions that changed things" },
      { id: "turning-points", name: "Turning points" },
    ],
  },
];

export const topicName = (id: string) => TOPICS.find((t) => t.id === id)?.name ?? id;
export const subtopicName = (topic: string, id: string) =>
  TOPICS.find((t) => t.id === topic)?.subtopics.find((s) => s.id === id)?.name ?? id;

export const GOALS = [
  { id: "replace-scrolling", name: "Replace mindless scrolling" },
  { id: "stocks-money", name: "Get better at stocks and money" },
  { id: "understand-people", name: "Understand people better" },
  { id: "business", name: "Build or grow a business" },
  { id: "sound-sharper", name: "Sound sharper in conversations" },
];

// Goals nudge the starting weight of the topic they point at.
export const GOAL_TOPIC: Record<string, string> = {
  "stocks-money": "finance",
  "understand-people": "psychology",
  business: "business",
};
