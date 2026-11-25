import Feed from "@/components/Feed";
import { getFeed } from "@/lib/feed";
import { Shell } from "@/lib/shell";

export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <Shell>
      <FeedLoader />
    </Shell>
  );
}

async function FeedLoader() {
  const feed = await getFeed();
  return <Feed initial={feed} />;
}
