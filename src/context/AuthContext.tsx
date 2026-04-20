import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  isSupabaseConfigured,
  supabase,
  SUPABASE_CONFIG_ERROR,
} from "@/src/lib/supabase";

type SignInParams = {
  email: string;
  password: string;
};

type SignUpParams = {
  email: string;
  password: string;
  displayName: string;
};

type AuthActionResult = {
  error: string | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isInitializing: boolean;
  isConfigured: boolean;
  configError: string | null;
  signIn: (params: SignInParams) => Promise<AuthActionResult>;
  signUp: (params: SignUpParams) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setIsInitializing(false);
      return;
    }

    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session ?? null);
      })
      .finally(() => {
        if (!active) return;
        setIsInitializing(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_, nextSession) => {
        setSession(nextSession ?? null);
      },
    );

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(
    async ({ email, password }: SignInParams): Promise<AuthActionResult> => {
      if (!supabase) return { error: SUPABASE_CONFIG_ERROR };

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    [],
  );

  const signUp = useCallback(
    async ({
      email,
      password,
      displayName,
    }: SignUpParams): Promise<AuthActionResult> => {
      if (!supabase) return { error: SUPABASE_CONFIG_ERROR };

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
          },
        },
      });

      return { error: error?.message ?? null };
    },
    [],
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase) return { error: SUPABASE_CONFIG_ERROR };
    const { error } = await supabase.auth.signOut();
    return { error: error?.message ?? null };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isInitializing,
      isConfigured: isSupabaseConfigured,
      configError: isSupabaseConfigured ? null : SUPABASE_CONFIG_ERROR,
      signIn,
      signUp,
      signOut,
    }),
    [isInitializing, session, signIn, signOut, signUp],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

