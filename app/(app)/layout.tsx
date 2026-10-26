"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BottomNav, { SideNav } from "../../components/BottomNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-stone-600">
        Loading…
      </div>
    );
  }

  if (status !== "authenticated") return null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl">
      <SideNav />
      <div className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-8 md:pt-8">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
