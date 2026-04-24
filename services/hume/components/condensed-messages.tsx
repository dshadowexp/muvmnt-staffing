"use client";

import { useMemo } from "react";
import { UserAvatar } from "@/features/users/components/user-avatar";
import { cn } from "@/lib/utils"
import { BrainCircuitIcon } from "lucide-react";

function AiAvatar({ shouldAnimate, maxFft }: { shouldAnimate: boolean; maxFft: number }) {
  const style = useMemo(
      () => shouldAnimate ? { scale: maxFft / 8 + 1 } : undefined,
      [shouldAnimate, maxFft],
  );

  return (
      <div className="relative">
          <div className={cn(
              "absolute inset-0 border-muted border-4 rounded-full",
              shouldAnimate ? "animate-ping" : "hidden",
          )} />
          <BrainCircuitIcon
              className="size-6 flex-shrink-0 relative"
              style={style}
          />
      </div>
  );
}

export function CondensedMessages({ messages, user, className, maxFft = 0 }: {
  messages: { isUser: boolean; content: string[] }[]
  user:     { name: string; imageUrl: string }
  className?: string
  maxFft?:  number
}) {
  return (
      <div className={cn("flex flex-col gap-4 w-full select-none", className)}>
          {messages.map((message, index) => {
              const shouldAnimate = index === messages.length - 1 && maxFft > 0;

              return (
                  <div
                      key={index}
                      className={cn(
                          "flex items-center gap-5 border pl-4 pr-6 py-4 rounded max-w-3/4",
                          message.isUser ? "self-end" : "self-start",
                      )}
                  >
                      {message.isUser ? (
                          <UserAvatar user={user} className="size-6 flex-shrink-0" />
                      ) : (
                          <AiAvatar shouldAnimate={shouldAnimate} maxFft={maxFft} />
                      )}
                      <div className="flex flex-col gap-1">
                          {message.content.map((text, i) => (
                              <span key={i}>{text}</span>
                          ))}
                      </div>
                  </div>
              );
          })}
      </div>
  );
}