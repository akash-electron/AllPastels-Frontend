"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useAuth } from "@/components/store/AuthProvider";
import type { AuthUser } from "@/types/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string;
              size?: string;
              shape?: string;
              text?: string;
              width?: number;
            },
          ) => void;
        };
      };
    };
  }
}

interface GoogleButtonProps {
  onSuccess: (user: AuthUser) => void;
}

export function GoogleButton({ onSuccess }: GoogleButtonProps) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const { signInWithGoogle } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (!clientId || !scriptReady) return;
    const google = window.google;
    if (!google || !buttonRef.current) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: ({ credential }) => {
        void (async () => {
          setError(null);
          const result = await signInWithGoogle(credential);
          if (result.ok) {
            onSuccessRef.current(result.user);
          } else {
            setError(result.error);
          }
        })();
      },
    });

    const container = buttonRef.current;
    container.innerHTML = "";
    google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: container.offsetWidth || 320,
    });
  }, [clientId, scriptReady, signInWithGoogle]);

  if (!clientId) return null;

  return (
    <div className="grid gap-3">
      {error && (
        <p
          role="alert"
          className="ap-body mb-5 border border-burnt/40 bg-burnt-900 px-4 py-3 text-sm text-burnt-200"
        >
          {error}
        </p>
      )}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div ref={buttonRef} className="flex justify-center" />
    </div>
  );
}