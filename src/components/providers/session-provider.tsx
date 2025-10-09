"use client";

import { SessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

type Props = {
  session: Session | null;
  children: ReactNode;
};

export function AuthSessionProvider({ session, children }: Props) {
  return <SessionProvider session={session}>{children}</SessionProvider>;
}
