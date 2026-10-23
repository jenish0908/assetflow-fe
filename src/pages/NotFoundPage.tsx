import { Link } from "react-router-dom";

import { EmptyState } from "../components/ui";

export function NotFoundPage({ what = "page" }: { what?: string }) {
  return (
    <EmptyState
      title={`This ${what} doesn't exist`}
      action={
        <Link className="btn btn-secondary" to="/">
          Go to the overview
        </Link>
      }
    >
      It may have been deleted, or the link is wrong.
    </EmptyState>
  );
}
