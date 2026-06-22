import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Minimal config: no R2 incremental cache wired yet (the site is mostly
// force-dynamic + SSR, so framework caching is optional). Add an R2 cache
// here later if we want ISR persistence across Worker instances.
export default defineCloudflareConfig();
