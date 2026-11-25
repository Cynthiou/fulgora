import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router";
import logo from "../../../assets/logo/fulgora-logo-light-bg.svg";
import TextField from "../../../components/TextField";
import { useAuth } from "../../../hooks/useAuth";
import { useLogin } from "../hooks/useLogin";

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
    <section className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <img src={logo} alt="Fulgora" className="h-10 w-auto self-start" />
      <div className="flex flex-col gap-2">
        <h1 className="text-display-md">Se connecter</h1>
        <p className="text-muted">Retrouve tes séances et tes programmes.</p>
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

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          id="identifier"
          label="Pseudo ou adresse e-mail"
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
              className="h-field shrink-0 rounded-btn border border-base-300 bg-base-100 px-3 font-semibold text-secondary"
            >
              {showPassword ? "Masquer" : "Afficher"}
            </button>
          }
        />

        <p className="text-sm text-muted">* Champs obligatoires</p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-btn rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
        >
          {isSubmitting ? "Connexion…" : "Se connecter"}
        </button>
        {isSubmitting && (
          <p role="status" className="sr-only">
            Connexion en cours
          </p>
        )}
      </form>

      <p className="text-center text-muted">
        Pas encore de compte ?{" "}
        <Link to="/inscription" className="font-semibold text-secondary">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}

export default LoginPage;
