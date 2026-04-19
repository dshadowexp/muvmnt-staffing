import posthog from 'posthog-js';
import { env } from '@/data/env/client';

posthog.init(env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    api_host: env.NEXT_PUBLIC_POSTHOG_HOST,
    defaults: '2026-01-30',
    capture_exceptions: env.NEXT_PUBLIC_NODE_ENV === 'production',
    debug: env.NEXT_PUBLIC_NODE_ENV === 'development',
    loaded: (ph) => {
        if (env.NEXT_PUBLIC_NODE_ENV === 'development') {
            ph.opt_out_capturing();
        }
    },
});


