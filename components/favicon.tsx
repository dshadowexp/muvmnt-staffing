"use client";

import { useEffect } from "react";

export function Favicon() {
    useEffect(() => {
        function updateFavicon() {
            const favicon = document.querySelector("link[rel='icon']");
            const path = document.hidden ? "/favicon-inactive.svg" : "/favicon.svg";
            favicon?.setAttribute("href", path);
        }

        document.addEventListener("visibilitychange", updateFavicon);
        return () => {
            document.removeEventListener("visibilitychange", updateFavicon);
        };
    }, []);

    return null;
}