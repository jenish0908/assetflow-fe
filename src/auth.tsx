import { useQueryClient } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { setUnauthorizedHandler, tokenStore } from "./api/client";
import { login as apiLogin, useMe } from "./api/hooks";
import type { Features, Role, User } from "./api/types";
import { can } from "./lib/format";

interface Session {
  user?: User;
  features?: Features;
  loading: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  /** Whether the signed-in user's role allows an action that needs `role`. */
  allows: (role: Role) => boolean;
}

const SessionContext = createContext<Session | null>(null);

export function useSession(): Session {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const [token, setToken] = useState<string | null>(() => tokenStore.get());
  const me = useMe(token !== null);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setToken(null);
    qc.clear();
  }, [qc]);

  useEffect(() => setUnauthorizedHandler(signOut), [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const t = await apiLogin(email, password);
    tokenStore.set(t);
    setToken(t);
  }, []);

  const value = useMemo<Session>(
    () => ({
      user: me.data?.user,
      features: me.data?.features,
      loading: token !== null && me.isPending,
      signedIn: token !== null,
      signIn,
      signOut,
      allows: (role) => can(me.data?.user.role, role),
    }),
    [me.data, me.isPending, token, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
