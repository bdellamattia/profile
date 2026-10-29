"use client";

import { useActionState, useState } from "react";
import { signIn, signUp } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [inState, inAction, inPending] = useActionState(signIn, undefined);
  const [upState, upAction, upPending] = useActionState(signUp, undefined);
  const state = mode === "in" ? inState : upState;
  const pending = mode === "in" ? inPending : upPending;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-10 text-center">
        <div className="mx-auto mb-5 grid size-20 place-items-center rounded-3xl bg-lime text-4xl text-black animate-pop">
          <span aria-hidden>💪</span>
        </div>
        <h1 className="font-display text-5xl tracking-tight">GYMBROS</h1>
        <p className="mt-3 text-muted">Snap your meals. Hit your protein. Beat your bros.</p>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-2xl border border-line bg-panel p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-xl py-2.5 font-display text-sm uppercase transition ${
              mode === m ? "bg-lime text-black" : "text-muted"
            }`}
          >
            {m === "in" ? "Sign in" : "Join the crew"}
          </button>
        ))}
      </div>

      <form action={mode === "in" ? inAction : upAction} className="flex flex-col gap-3">
        {mode === "up" && (
          <input name="name" required maxLength={30} placeholder="Bro name" className="input" />
        )}
        <input name="email" type="email" required autoComplete="email" placeholder="Email" className="input" />
        <input
          name="password"
          type="password"
          required
          minLength={mode === "up" ? 8 : undefined}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          placeholder="Password"
          className="input"
        />
        {mode === "up" && <input name="invite" placeholder="Invite code" className="input" />}

        {state?.error && <p className="text-sm text-pink">{state.error}</p>}
        {state?.info && <p className="text-sm text-lime">{state.info}</p>}

        <button type="submit" disabled={pending} className="btn-lime mt-2">
          {pending ? "Loading..." : mode === "in" ? "Let's go" : "Create account"}
        </button>
      </form>
    </main>
  );
}
