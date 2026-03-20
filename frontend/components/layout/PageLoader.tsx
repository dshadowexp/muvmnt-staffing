"use client";

import { useEffect, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MESSAGES = [
  "Matching your request…",
  "Verifying credentials…",
  "Connecting you to care…",
  "Preparing your dashboard…",
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** The animated cross/plus mark that pulses — a nod to healthcare */
function HealthCross({ size = 48 }: { size?: number }) {
    const arm = size * 0.28;
    const thick = size * 0.26;
    return (
        <div style={{
            width: size, height: size,
            position: "relative", flexShrink: 0,
            animation: "loader-pulse 2.4s ease-in-out infinite",
        }}>
        {/* Horizontal arm */}
        <div style={{
            position: "absolute",
            top: "50%", left: 0, right: 0,
            height: thick,
            marginTop: -(thick / 2),
            background: "var(--teal)",
            borderRadius: thick / 2,
        }} />
        {/* Vertical arm */}
        <div style={{
            position: "absolute",
            left: "50%", top: 0, bottom: 0,
            width: thick,
            marginLeft: -(thick / 2),
            background: "var(--teal)",
            borderRadius: thick / 2,
        }} />
        </div>
    );
}

/** Three animated dots that sequence */
function TypingDots() {
    return (
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center", marginLeft: 2 }}>
        {[0, 1, 2].map(i => (
            <span key={i} style={{
            width: 4, height: 4, borderRadius: "50%",
            background: "var(--teal)",
            display: "inline-block",
            animation: `loader-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }} />
        ))}
        </span>
    );
}

/** Slim shimmer progress bar */
function ProgressBar({ progress }: { progress: number }) {
    return (
        <div style={{
        width: "100%", maxWidth: 240,
        height: 2,
        background: "rgba(13,148,136,0.12)",
        borderRadius: 1,
        overflow: "hidden",
        }}>
        <div style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--teal-dark), var(--teal-mid))",
            borderRadius: 1,
            transition: "width 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
        }}>
            {/* Shimmer sweep */}
            <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)",
            animation: "loader-shimmer 1.6s ease-in-out infinite",
            }} />
        </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PageLoaderProps {
    /** Override the cycling messages */
    message?: string;
    /** Show a full-screen overlay (default) vs inline block */
    fullScreen?: boolean;
}

export default function PageLoader({ message, fullScreen = true }: PageLoaderProps) {
    const [progress, setProgress]     = useState(8);
    const [msgIndex, setMsgIndex]     = useState(0);
    const [visible, setVisible]       = useState(false);

    // Fade in on mount
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 20);
        return () => clearTimeout(t);
    }, []);

    // Organic progress simulation
    useEffect(() => {
        const intervals: ReturnType<typeof setTimeout>[] = [];

        const steps = [
        { target: 30, delay: 200,  duration: 400 },
        { target: 55, delay: 700,  duration: 600 },
        { target: 72, delay: 1400, duration: 500 },
        { target: 88, delay: 2200, duration: 800 },
        { target: 95, delay: 3200, duration: 1200 },
        ];

        steps.forEach(({ target, delay }) => {
        intervals.push(setTimeout(() => setProgress(target), delay));
        });

        return () => intervals.forEach(clearTimeout);
    }, []);

    // Cycle through messages
    useEffect(() => {
        if (message) return; // don't cycle if a fixed message is provided
            const id = setInterval(() => {
            setMsgIndex(i => (i + 1) % MESSAGES.length);
        }, 2000);
        return () => clearInterval(id);
    }, [message]);

    const displayMessage = message ?? MESSAGES[msgIndex];

    const content = (
        <div style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        gap: 0,
        }}>
        {/* Logo mark */}
        <div style={{
            display: "flex", alignItems: "center", gap: 14,
            marginBottom: 36,
            animation: "loader-fadein 0.5s ease both",
        }}>
            {/* Teal box with cross */}
            <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: "var(--teal)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 0 8px rgba(13,148,136,0.12), 0 0 0 16px rgba(13,148,136,0.06)",
            animation: "loader-glow 2.4s ease-in-out infinite",
            }}>
            <HealthCross size={28} />
            </div>

            {/* Wordmark */}
            <div>
            <div style={{
                fontFamily: "var(--font-display)", fontWeight: 800,
                fontSize: "1.6rem", color: "var(--charcoal)",
                letterSpacing: "-0.5px", lineHeight: 1,
            }}>
                Muvmnt
            </div>
            <div style={{
                fontSize: "0.7rem", color: "var(--soft)",
                fontWeight: 300, letterSpacing: "1.5px",
                textTransform: "uppercase", marginTop: 3,
            }}>
                Staffing
            </div>
            </div>
        </div>

        {/* Progress bar */}
        <div style={{
            marginBottom: 20,
            animation: "loader-fadein 0.5s 0.15s ease both",
            opacity: 0,
            animationFillMode: "forwards" as const,
        }}>
            <ProgressBar progress={progress} />
        </div>

        {/* Status message */}
        <div style={{
            display: "flex", alignItems: "center", gap: 6,
            height: 20,
            animation: "loader-fadein 0.5s 0.25s ease both",
            opacity: 0,
            animationFillMode: "forwards" as const,
        }}>
            <span style={{
            fontSize: "0.78rem", color: "var(--mid)",
            fontWeight: 300, letterSpacing: "0.2px",
            transition: "opacity 0.3s ease",
            }}>
            {displayMessage}
            </span>
            <TypingDots />
        </div>
        </div>
    );

    if (!fullScreen) return content;

    return (
        <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "var(--teal-pale)",
        display: "flex", alignItems: "center", justifyContent: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.3s ease",
        // Grid texture — matches hero sections
        }}>
        {/* Background grid */}
        <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: `
            linear-gradient(rgba(13,148,136,0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(13,148,136,0.06) 1px, transparent 1px)
            `,
            backgroundSize: "52px 52px",
        }} />
        {/* Radial vignette */}
        <div style={{
            position: "absolute", inset: 0, pointerEvents: "none",
            background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 40%, rgba(240,253,250,0.7) 100%)",
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
            {content}
        </div>

        <style>{`
            @keyframes loader-fadein {
            from { opacity: 0; transform: translateY(10px); }
            to   { opacity: 1; transform: translateY(0); }
            }
            @keyframes loader-pulse {
            0%, 100% { opacity: 1;    transform: scale(1); }
            50%       { opacity: 0.7; transform: scale(0.92); }
            }
            @keyframes loader-glow {
            0%, 100% { box-shadow: 0 0 0 8px rgba(13,148,136,0.12), 0 0 0 16px rgba(13,148,136,0.06); }
            50%       { box-shadow: 0 0 0 12px rgba(13,148,136,0.18), 0 0 0 24px rgba(13,148,136,0.08); }
            }
            @keyframes loader-dot {
            0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
            40%            { transform: scale(1);   opacity: 1; }
            }
            @keyframes loader-shimmer {
            0%   { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
            }
        `}</style>
        </div>
    );
}