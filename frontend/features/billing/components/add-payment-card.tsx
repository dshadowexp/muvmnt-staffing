"use client"

import { useState } from "react";
import { useRouter } from "next/navigation"
import { CreditCard } from "lucide-react";

export function AddCardButton() {
  const router = useRouter()
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={() => router.push("/onboarding/payment/add")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 6,
        width: "100%", padding: "20px 13px",
        border: `1px dashed ${hovered ? "var(--teal)" : "rgba(13,148,136,0.25)"}`,
        borderRadius: 8,
        background: hovered ? "var(--teal-pale)" : "white",
        cursor: "pointer",
        fontFamily: "var(--font-body)",
        transition: "border-color 0.15s, background 0.15s, color 0.15s",
      }}
    >

      {/* Label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 5,
        fontSize: "0.845rem", fontWeight: 500,
        color: hovered ? "var(--teal)" : "var(--mid)",
        transition: "color 0.15s",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 32, height: 24, borderRadius: 8,
          background: hovered ? "rgba(13,148,136,0.12)" : "rgba(143,168,164,0.1)",
          transition: "background 0.15s",
          marginBottom: 2,
        }}>
          <CreditCard
            size={15}
            style={{ color: hovered ? "var(--teal)" : "var(--soft)", transition: "color 0.15s" }}
          />
        </div>
        Add credit/debit card
      </div>
    </button>
  );
}