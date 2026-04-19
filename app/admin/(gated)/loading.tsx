import { FullPageSpinner } from "@/components/Spinner";

// Fallback for any admin subroute that doesn't ship its own loading.tsx.
// Queue / triage / reports pull joins across creations+reports+users+tags,
// which can be slow on a cold connection; show a spinner so mods don't
// wonder if their click landed.
export default function Loading() {
  return <FullPageSpinner label="Loading admin" />;
}
