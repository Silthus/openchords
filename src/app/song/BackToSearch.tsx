import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import type { MouseEvent } from "react";

export function BackToSearch() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const returnToSearch = (event: MouseEvent) => {
    if (!canGoBack || opensElsewhere(event)) return;
    event.preventDefault();
    router.history.back();
  };
  return (
    <Link to="/" onClick={returnToSearch} className="inline-block py-2 text-base font-semibold text-accent">
      ‹ Search
    </Link>
  );
}

function opensElsewhere(event: MouseEvent) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}
