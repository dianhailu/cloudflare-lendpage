"use client";

import { useEffect, useState } from "react";

export default function LandingPage() {
  const [mode, setMode] = useState<"loading" | "confirm">("loading");
  const [targetUrl, setTargetUrl] = useState("https://pingoapp.net");

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes("android");
    const currentParams = window.location.search || "";
    const registerUrl = "https://pingoapp.net" + currentParams;

    setTargetUrl(registerUrl);

    if (isAndroid) {
      setMode("loading");
      setTimeout(() => {
        window.location.href = registerUrl;
      }, 1000);
    } else {
      setMode("confirm");
    }
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f6f7fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "380px",
          background: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
          padding: "32px 24px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "30px",
            fontWeight: "bold",
            color: "#1f2937",
            marginBottom: "12px",
          }}
        >
          PinGo
        </div>

        {mode === "loading" && (
          <>
            <div
              style={{
                fontSize: "16px",
                color: "#6b7280",
                marginBottom: "24px",
                lineHeight: 1.6,
              }}
            >
              Preparing your secure access...
            </div>

            <div
              style={{
                width: "44px",
                height: "44px",
                border: "4px solid #e5e7eb",
                borderTop: "4px solid #22c55e",
                borderRadius: "50%",
                margin: "0 auto 18px",
                animation: "spin 1s linear infinite",
              }}
            />

            <div
              style={{
                fontSize: "16px",
                color: "#374151",
                marginBottom: "10px",
              }}
            >
              Loading...
            </div>

            <div
              style={{
                fontSize: "13px",
                color: "#9ca3af",
                lineHeight: 1.5,
              }}
            >
              Please wait a moment.
            </div>
          </>
        )}

        {mode === "confirm" && (
          <>
            <div
              style={{
                fontSize: "16px",
                color: "#4b5563",
                lineHeight: 1.7,
                marginBottom: "24px",
              }}
            >
              This application is currently available on Android only.
              <br />
              Do you want to continue to the registration page?
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                justifyContent: "center",
              }}
            >
              <a
                href={targetUrl}
                style={{
                  display: "inline-block",
                  background: "#22c55e",
                  color: "#ffffff",
                  textDecoration: "none",
                  padding: "12px 22px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  minWidth: "120px",
                }}
              >
                Continue
              </a>

              <a
                href="https://www.google.com"
                style={{
                  display: "inline-block",
                  background: "#e5e7eb",
                  color: "#374151",
                  textDecoration: "none",
                  padding: "12px 22px",
                  borderRadius: "10px",
                  fontWeight: "bold",
                  minWidth: "120px",
                }}
              >
                Exit
              </a>
            </div>
          </>
        )}

        <style jsx>{`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
