import {
  type FormEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { formatSignupErrorSummary, type PublicUser } from "shared";
import logo from "../../../assets/logo/fulgora-logo-light-bg.svg";
import TextField from "../../../components/TextField";
import { useAuth } from "../../../hooks/useAuth";
import SignupSuccess from "../components/SignupSuccess";
import { SIGNUP_FIELDS, type SignupField, useSignup } from "../hooks/useSignup";

const PASSWORD_HELP = "8 caractères minimum, dont un chiffre.";
const PASSWORD_CLEARED_HELP = "Pour ta sécurité, ressaisis ton mot de passe.";

// Screen 01: signup form (states 1 to 4) and success screen (state 5).
function SignupPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { isSubmitting, fieldErrors, formError, lastErrorCode, submit } =
    useSignup();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordCleared, setPasswordCleared] = useState(false);
  const [createdUser, setCreatedUser] = useState<PublicUser | null>(null);

  // One ref per field, to move the focus to the first field in error.
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const errorCount = SIGNUP_FIELDS.filter((field) => fieldErrors[field]).length;

  useEffect(() => {
    const refsByField: Record<
      SignupField,
      RefObject<HTMLInputElement | null>
    > = {
      username: usernameRef,
      email: emailRef,
      password: passwordRef,
      terms_accepted: termsRef,
    };
    const firstInError = SIGNUP_FIELDS.find((field) => fieldErrors[field]);
    if (firstInError !== undefined) {
      refsByField[firstInError].current?.focus();
    }
  }, [fieldErrors]);

  if (createdUser !== null) {
    return (
      <SignupSuccess
        user={createdUser}
        onStart={() => navigate("/", { replace: true })}
      />
    );
  }

  // Already connected: nothing to sign up for.
  if (user !== null) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await submit({
      username,
      email,
      password,
      terms_accepted: termsAccepted,
    });

    if (created !== null) {
      login(created);
      setCreatedUser(created);
      return;
    }

    // After any error: username, e-mail and the box are kept, the password
    // is cleared (sensitive data).
    setPassword("");
    setPasswordCleared(true);
  }

  const emailError =
    fieldErrors.email !== undefined && lastErrorCode === "EMAIL_TAKEN" ? (
      <>
        {fieldErrors.email}{" "}
        <Link
          to={`/connexion?email=${encodeURIComponent(email)}`}
          className="font-semibold text-secondary"
        >
          Se connecter
        </Link>
      </>
    ) : (
      fieldErrors.email
    );

  return (
    <section className="mx-auto flex max-w-md flex-col gap-6 p-4">
      <img src={logo} alt="Fulgora" className="h-10 w-auto self-start" />
      <div className="flex flex-col gap-2">
        <h1 className="text-display-md">Créer mon compte</h1>
        <p className="text-muted">
          Crée ton compte pour planifier tes séances et suivre ta progression.
        </p>
      </div>

      {(errorCount > 0 || formError !== null) && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-card border border-status-missed bg-base-100 p-3 font-semibold"
        >
          <span aria-hidden="true" className="text-status-missed">
            !
          </span>
          <p>{formError ?? formatSignupErrorSummary(errorCount)}</p>
        </div>
      )}

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TextField
          id="username"
          label="Pseudo"
          required
          ref={usernameRef}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Ex. lea.m"
          autoComplete="username"
          readOnly={isSubmitting}
          error={fieldErrors.username}
        />
        <TextField
          id="email"
          label="Adresse e-mail"
          required
          ref={emailRef}
          type="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="nom@exemple.fr"
          autoComplete="email"
          readOnly={isSubmitting}
          error={emailError}
        />
        <TextField
          id="password"
          label="Mot de passe"
          required
          ref={passwordRef}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setPasswordCleared(false);
          }}
          placeholder="8 caractères minimum"
          autoComplete="new-password"
          readOnly={isSubmitting}
          help={passwordCleared ? PASSWORD_CLEARED_HELP : PASSWORD_HELP}
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

        <div className="flex flex-col gap-1.5">
          <label className="flex min-h-tap items-start gap-3 py-2">
            <input
              ref={termsRef}
              id="terms_accepted"
              type="checkbox"
              checked={termsAccepted}
              onChange={(event) => setTermsAccepted(event.target.checked)}
              disabled={isSubmitting}
              aria-required
              aria-invalid={
                fieldErrors.terms_accepted === undefined ? undefined : true
              }
              aria-describedby={
                fieldErrors.terms_accepted === undefined
                  ? undefined
                  : "terms_accepted-error"
              }
              className="mt-1 size-5 shrink-0 accent-secondary"
            />
            <span>
              J'accepte les{" "}
              <a
                href="/cgu"
                target="_blank"
                rel="noopener"
                className="font-semibold text-secondary"
              >
                Conditions générales d'utilisation
              </a>{" "}
              et la{" "}
              <a
                href="/confidentialite"
                target="_blank"
                rel="noopener"
                className="font-semibold text-secondary"
              >
                Politique de confidentialité
              </a>{" "}
              *
            </span>
          </label>
          {fieldErrors.terms_accepted !== undefined && (
            <p
              id="terms_accepted-error"
              className="flex items-start gap-1 text-sm font-semibold"
            >
              <span aria-hidden="true" className="text-status-missed">
                ⚠
              </span>
              <span>{fieldErrors.terms_accepted}</span>
            </p>
          )}
        </div>

        <p className="text-sm text-muted">* Champs obligatoires</p>

        <button
          type="submit"
          disabled={isSubmitting}
          className="h-btn rounded-btn bg-primary font-extrabold uppercase tracking-wide text-primary-content shadow-action disabled:opacity-60"
        >
          {isSubmitting ? "Création du compte…" : "Créer mon compte"}
        </button>
        {isSubmitting && (
          <p role="status" className="sr-only">
            Création du compte en cours
          </p>
        )}
      </form>

      <p className="text-center text-muted">
        Déjà un compte ?{" "}
        <Link to="/connexion" className="font-semibold text-secondary">
          Se connecter
        </Link>
      </p>
    </section>
  );
}

export default SignupPage;
