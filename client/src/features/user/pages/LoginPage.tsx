import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import boltIcon from "../../../assets/icons/ui/app/bolt.svg";
import eyeIcon from "../../../assets/icons/ui/app/eye.svg";
import eyeOffIcon from "../../../assets/icons/ui/app/eye-off.svg";
import lockIcon from "../../../assets/icons/ui/app/lock.svg";
import userIcon from "../../../assets/icons/ui/app/user.svg";
import Icon from "../../../components/Icon";
import TextField from "../../../components/TextField";
import { useAuth } from "../../../hooks/useAuth";
import { useLogin } from "../hooks/useLogin";

const PRIMARY_BUTTON =
  "flex h-btn w-full items-center justify-center rounded-btn bg-primary text-[15px] font-extrabold uppercase tracking-[0.02em] text-primary-content shadow-action disabled:opacity-60";

// Screen 02: login form (states 1 to 4). State 5 is the redirection itself.
function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isSubmitting, fieldErrors, formError, submit } = useLogin();

  // Coming from the signup page with an e-mail already used: pre-filled.
  const [identifier, setIdentifier] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Where to go once connected: the private page asked for, or the home page.
  const state = location.state as { from?: string } | null;
  const destination = state?.from ?? "/";

  // Wrong login: the password is cleared and the focus goes back to it.
  useEffect(() => {
    if (formError !== null) {
      passwordRef.current?.focus();
    }
  }, [formError]);

  // Empty fields: focus on the first one in error.
  useEffect(() => {
    if (fieldErrors.identifier !== undefined) {
      identifierRef.current?.focus();
    } else if (fieldErrors.password !== undefined) {
      passwordRef.current?.focus();
    }
  }, [fieldErrors]);

  // Already connected: straight to the destination.
  if (user !== null) {
    return <Navigate to={destination} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const connected = await submit({ identifier, password });

    if (connected !== null) {
      login(connected);
      navigate(destination, { replace: true });
      return;
    }

    setPassword("");
  }

  return (
    <section className="mx-auto flex min-h-screen max-w-md flex-col gap-4 px-[22px] pt-3 pb-4">
      {/* The logo of the mockups: the bolt and the name (01-1). */}
      <span className="flex items-center gap-2 pt-1">
        <Icon src={boltIcon} className="size-6 shrink-0 text-secondary" />
        <span className="font-display text-[26px] font-extrabold uppercase italic leading-none tracking-[0.1em]">
          Fulgora
        </span>
      </span>
      <div className="flex flex-col gap-2.5 pt-1.5">
        <h1 className="text-[54px] leading-none">Se connecter</h1>
        <p className="text-sm leading-[1.45] text-muted">
          Retrouve tes séances et tes programmes.
        </p>
      </div>

      {formError !== null && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-card border border-status-missed bg-base-100 p-3 font-semibold"
        >
          <span aria-hidden="true" className="text-status-missed">
            !
          </span>
          <p>{formError}</p>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        <TextField
          id="identifier"
          label="Pseudo ou adresse e-mail"
          icon={userIcon}
          required
          ref={identifierRef}
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          placeholder="Ex. lea.m ou nom@exemple.fr"
          autoComplete="username"
          readOnly={isSubmitting}
          error={fieldErrors.identifier}
        />
        <TextField
          id="password"
          label="Mot de passe"
          icon={lockIcon}
          required
          ref={passwordRef}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Ton mot de passe"
          autoComplete="current-password"
          readOnly={isSubmitting}
          error={fieldErrors.password}
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              aria-label={
                showPassword
                  ? "Masquer le mot de passe"
                  : "Afficher le mot de passe"
              }
              className="absolute right-1 grid size-tap place-items-center text-muted"
            >
              <Icon
                src={showPassword ? eyeOffIcon : eyeIcon}
                className="size-5"
              />
            </button>
          }
        />

        <p className="text-xs font-medium leading-[1.45] text-muted">
          * Champs obligatoires
        </p>

        <button
          type="submit"
          disabled={isSubmitting}
          className={PRIMARY_BUTTON}
        >
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </button>
        {isSubmitting && (
          <p role="status" className="sr-only">
            Connexion en cours
          </p>
        )}
      </form>

      <p className="pt-1 text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link to="/inscription" className="font-bold text-secondary">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
