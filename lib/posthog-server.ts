import { env } from "@/data/env/client";
import { PostHog } from "posthog-node";

export function getPostHogClient() {
  if (env.NEXT_PUBLIC_NODE_ENV === 'production') {  
    return new PostHog(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      host: env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
    });
  }
  
  return null;
}
