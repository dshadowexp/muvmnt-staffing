import "server-only";
import { env } from "@/data/env/server";
import arcjet, { 
    detectBot, 
    shield,
    validateEmail,
    fixedWindow,
    slidingWindow
} from "@arcjet/next";

export {
    detectBot,
    shield,
    validateEmail,
    fixedWindow,
    slidingWindow,
}

export default arcjet({
    key: env.ARCJET_KEY,
    rules: [
        // detectBot({
        //     mode: env.ARCJET_ENV === "production" ? "LIVE" : "DRY_RUN" as ArcjetMode,
        //     allow: [
        //         "CATEGORY:SEARCH_ENGINE",
        //         "CATEGORY:PREVIEW",
        //     ],
        // }),
    ],
});

