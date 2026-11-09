"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// EU-focused ePrivacy-style cookie notice. We don't use ad / analytics
// cookies, but session cookies are set at login; best practice is to
// disclose the first time any visitor lands. Dismissal persists in
// localStorage so returning visitors never see it twice.
const KEY = "ssi-cookie-ack-v1";

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      if (!v) setVisible(true);
    } catch {
      // Private mode / blocked storage — don't surface the banner
      // rather than show it on every nav; failing closed is kinder
      // than failing loud.
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, new Date().toISOString());
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie notice">
      <div className="cookie-banner-text">
        <span className="cookie-banner-ic" aria-hidden>
          ◉
        </span>
        <span>
          We use <strong>essential cookies</strong> for login and session state. No ads, no
          cross-site tracking, no third-party analytics.{" "}
          <Link href="/legal/privacy" className="cookie-banner-link">
            Privacy policy
          </Link>
          .
        </span>
      </div>
      <button type="button" className="cookie-banner-btn" onClick={dismiss}>
        OK · dismiss
      </button>
    </div>
  );
}
