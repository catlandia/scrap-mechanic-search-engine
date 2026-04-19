import { FullPageSpinner } from "@/components/Spinner";

// Detail pages hit the DB, Steam Web API, and tag queries in parallel — on a
// cold cache this can take a second or two. A framed spinner tells the user
// the app heard their click instead of leaving the old page stale.
export default function Loading() {
  return <FullPageSpinner label="Loading creation" />;
}
