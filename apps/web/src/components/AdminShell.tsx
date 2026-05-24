"use client";

import { type ReactNode } from "react";
import { Nav } from "./Nav";
import { TokenGate } from "./TokenGate";

type AdminShellProps = {
  children: (token: string) => ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <TokenGate>
      {(token) => (
        <>
          <Nav />
          <main className="page-shell">{children(token)}</main>
        </>
      )}
    </TokenGate>
  );
}
