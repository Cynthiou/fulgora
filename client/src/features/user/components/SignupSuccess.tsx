import { useEffect, useRef } from "react";
import type { PublicUser } from "shared";

type Props = {
  user: PublicUser;
  onStart: () => void;
};

// Screen 01, state 5: the account exists and the session is open.
function SignupSuccess({ user, onStart }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Announced to screen readers: the focus lands on the title.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <p aria-hidden="true" className="text-display-lg text-status-done">
        ✓
      </p>
      <h1 ref={titleRef} tabIndex={-1} className="text-display-md">
        Compte créé
      </h1>
      <p className="font-semibold">
        Bienvenue {user.username}. Ton compte est prêt.
      </p>
      <p className="text-muted">
        Tu es connecté. Tu peux commencer à planifier tes séances.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="h-btn rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action"
      >
        Commencer
      </button>
    </section>
  );
}

export default SignupSuccess;
