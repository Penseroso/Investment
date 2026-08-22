"use client";

import Link from "next/link";
import { Buildings, CalendarBlank, Pulse } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

type AppSection = "calendar" | "risk" | "research";

const navigationItems = [
  { id: "calendar", label: "일정", href: "/", icon: CalendarBlank },
  { id: "risk", label: "리스크", href: "/risk", icon: Pulse },
  { id: "research", label: "종목", href: "/research", icon: Buildings },
] as const;

let statusRequest: Promise<boolean> | null = null;
let statusFetchedAt = 0;

function loadUnread(revalidate = false) {
  if (revalidate && Date.now() - statusFetchedAt > 30_000) statusRequest = null;
  statusRequest ??= fetch("/api/risk?mode=status", { cache: "no-store" })
    .then(async (response): Promise<{ unread?: boolean }> =>
      response.ok ? (await response.json()) as { unread?: boolean } : { unread: false },
    )
    .then((payload) => {
      statusFetchedAt = Date.now();
      return Boolean(payload.unread);
    })
    .catch(() => false);
  return statusRequest;
}

function useRiskUnread(active: AppSection) {
  const [unread, setUnread] = useState(false);
  useEffect(() => {
    const handleRead = () => {
      statusRequest = Promise.resolve(false);
      setUnread(false);
    };
    const revalidate = () => void loadUnread(true).then(setUnread);
    window.addEventListener("risk-report-read", handleRead);
    window.addEventListener("focus", revalidate);
    if (active !== "risk") void loadUnread().then(setUnread);
    const interval = window.setInterval(revalidate, 15 * 60 * 1000);
    return () => {
      window.removeEventListener("risk-report-read", handleRead);
      window.removeEventListener("focus", revalidate);
      window.clearInterval(interval);
    };
  }, [active]);
  return unread;
}

export function PrimaryNavigation({ active }: { active: AppSection }) {
  const riskUnread = useRiskUnread(active);
  return (
    <nav className="primary-navigation" aria-label="주요 화면">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={active === item.id ? "primary-navigation-active" : ""}
            aria-current={active === item.id ? "page" : undefined}
          >
            <Icon size={18} weight={active === item.id ? "fill" : "regular"} />
            <span>{item.label}</span>
            {item.id === "risk" && riskUnread && <i className="navigation-unread" aria-label="새 리스크 리포트" />}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileBottomNavigation({ active }: { active: AppSection }) {
  const riskUnread = useRiskUnread(active);
  return (
    <nav className="mobile-bottom-navigation" aria-label="주요 화면">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={active === item.id ? "mobile-navigation-active" : ""}
            aria-current={active === item.id ? "page" : undefined}
          >
            <Icon size={20} weight={active === item.id ? "fill" : "regular"} />
            <span>{item.label}</span>
            {item.id === "risk" && riskUnread && <i className="navigation-unread" aria-label="새 리스크 리포트" />}
          </Link>
        );
      })}
    </nav>
  );
}
