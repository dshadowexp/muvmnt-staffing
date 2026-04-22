"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/features/auth/providers/auth-provider";
import { useFcmToken } from "@/features/notifications/hooks/use-fcm-token";
import { registerPushTokenAction } from "@/features/notifications/actions";

export function PushTokenRegistrar() {
  const { authUser } = useAuth();
  const { token } = useFcmToken();
  const lastSentToken = useRef<string | null>(null);

  useEffect(() => {
    if (!token || !authUser || token === lastSentToken.current) return;

    registerPushTokenAction(token)
      .then((res) => {
        if (!res.error) lastSentToken.current = token;
      })
  }, [token, authUser]);

  return null;
}
