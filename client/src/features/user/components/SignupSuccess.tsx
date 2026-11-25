import { useEffect, useRef } from "react";
import type { PublicUser } from "shared";
import arrowRightIcon from "../../../assets/icons/ui/app/arrow-right.svg";
import boltIcon from "../../../assets/icons/ui/app/bolt.svg";
import checkIcon from "../../../assets/icons/ui/app/check.svg";
import Icon from "../../../components/Icon";

type Props = {
  user: PublicUser;
  onStart: () => void;
};

// Screen 01-5: the account exists and the session is open. A big green
// check, the news in 58 px, then the way in.
function SignupSuccess({ user, onStart }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Announced to screen readers: the focus lands on the title.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-[22px] pt-3 pb-4">
      <span className="flex items-center gap-2 pt-1">
        <Icon src={boltIcon} className="size-6 shrink-0 text-secondary" />
        <span className="font-display text-[26px] font-extrabold uppercase italic leading-none tracking-[0.1em]">
          Fulgora
        </span>
      </span>

      <div className="flex flex-1 flex-col justify-center gap-4">
        <span
          aria-hidden="true"
          className="grid size-21 place-items-center rounded-full bg-status-done text-white shadow-done"
        >
          <Icon src={checkIcon} className="size-10" />
        </span>
        <h1 ref={titleRef} tabIndex={-1} className="text-[58px] leading-none">
          Compte créé
        </h1>
        <p className="text-base font-semibold leading-[1.45]">
          Bienvenue {user.username}. Ton compte est prêt.
        </p>
        <p className="text-sm leading-[1.45] text-muted">
          Tu es connecté. Tu peux commencer à planifier tes séances.
        </p>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="flex h-btn w-full items-center justify-center gap-2.5 rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action"
      >
        <Icon src={arrowRightIcon} className="size-[18px]" />
        Commencer
      </button>
    </section>
  );
}

export default SignupSuccess;
