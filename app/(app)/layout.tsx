"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BottomNav from "../../components/BottomNav";

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
    <div className="mx-auto min-h-screen w-full max-w-lg px-4 pb-24 pt-4">
      {children}
      <BottomNav />
    </div>
  );
}
