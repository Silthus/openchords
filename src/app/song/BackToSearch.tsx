import { Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import type { MouseEvent } from "react";

export function BackToSearch() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const returnToSearch = (event: MouseEvent) => {
    if (!canGoBack) return;
    event.preventDefault();
    router.history.back();
  };
  return (
    <Link to="/" onClick={returnToSearch} className="inline-block py-2 text-base font-semibold text-orange-600">
      ‹ Search
    </Link>
  );
}
