import type { Discovery } from "./discovery";

type SearchStatusProps = { query: string; discovery: Discovery; listIsEmpty: boolean };

export function SearchStatus({ query, discovery, listIsEmpty }: SearchStatusProps) {
  return (
    <>
      {listIsEmpty && foundNothing(discovery) && <p className="mt-6 text-lg text-muted">No Songs found for “{query}”.</p>}
      <DiscoveryLine discovery={discovery} listIsEmpty={listIsEmpty} />
    </>
  );
}

function DiscoveryLine({ discovery, listIsEmpty }: Omit<SearchStatusProps, "query">) {
  const stillLooking = discovery === "looking" || (discovery === "found" && listIsEmpty);
  if (stillLooking) return <p className="mt-4 text-base text-muted motion-safe:animate-pulse">Looking for more songs…</p>;
  if (discovery === "moreComing") return <p className="mt-4 text-base text-muted">More results in a moment</p>;
  if (discovery === "gaveUp") return <p className="mt-4 text-base text-muted">No more results right now. Try again in a moment.</p>;
  return null;
}

function foundNothing(discovery: Discovery) {
  return discovery === "nothingFound" || discovery === "gaveUp";
}
