import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import type { UserPreferences } from "shared";
import alertIcon from "../../../assets/icons/ui/app/alert.svg";
import bellIcon from "../../../assets/icons/ui/app/bell.svg";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import PageHeader from "../../../components/PageHeader";
import { usePreferences } from "../hooks/usePreferences";

// The browser may not know notifications at all (desktop Safari, an old
// phone): the switch stays off and says so (RM-063).
function hasNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

type SwitchRowProps = {
  id: string;
  title: string;
  subtitle: string;
  isOn: boolean;
  isFirst: boolean;
  isDisabled: boolean;
  note?: string;
  onToggle: (next: boolean) => void;
};

// One line of the card: its name, what it does, and the switch on the right.
function SwitchRow({
  id,
  title,
  subtitle,
  isOn,
  isFirst,
  isDisabled,
  note,
  onToggle,
}: SwitchRowProps) {
  return (
    <div
      className={`flex items-center gap-3 px-[14px] py-3 ${
        isFirst ? "" : "border-t border-base-300"
      }`}
    >
      <span className="flex flex-1 flex-col gap-0.5">
        <b id={`${id}-label`} className="text-[15px] font-semibold">
          {title}
        </b>
        <span id={`${id}-help`} className="text-xs leading-[1.45] text-muted">
          {note ?? subtitle}
        </span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-labelledby={`${id}-label`}
        aria-describedby={`${id}-help`}
        disabled={isDisabled}
        onClick={() => onToggle(!isOn)}
        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-60 ${
          isOn ? "border-secondary bg-secondary" : "border-base-300 bg-track"
        }`}
      >
        <span
          aria-hidden="true"
          className={`absolute top-[2px] size-[22px] rounded-full bg-base-100 shadow-card transition-all ${
            isOn ? "left-[23px]" : "left-[2px]"
          }`}
        />
      </button>
    </div>
  );
}

// Screens PRF-04 and NOT-08: the alerts of the timers, three switches that
// do not depend on each other (RM-062). Nothing here is ever written as a
// notification of the bell.
function SoundSettingsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { preferences, isSaving, error, save } = usePreferences();
  const [refused, setRefused] = useState(false);
  // NOT-08: the same screen, opened from the notifications (US-46)
  const fromNotifications = searchParams.get("depuis") === "notifications";

  if (preferences === null) {
    return null;
  }

  // Enabling the notifications of the timer asks the phone first; a refusal
  // leaves the switch off with a message.
  async function toggle(
    field: keyof UserPreferences,
    next: boolean,
  ): Promise<void> {
    if (field === "timer_notification_enabled" && next) {
      setRefused(false);
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setRefused(true);
        return;
      }
    }
    await save({ [field]: next });
  }

  const canNotify = hasNotifications();

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() =>
          navigate(fromNotifications ? "/notifications" : "/profil")
        }
        backLabel={
          fromNotifications ? "Retour aux notifications" : "Retour au profil"
        }
        title="Sons et minuteurs"
      />

      <div className="flex flex-1 flex-col gap-3 px-[18px] pt-1 pb-6">
        <div className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
          <SwitchRow
            id="sound"
            title="Sons"
            subtitle="Bips de fin de minuteur et de repos"
            isOn={preferences.sound_enabled}
            isFirst
            isDisabled={isSaving}
            onToggle={(next) => void toggle("sound_enabled", next)}
          />
          <SwitchRow
            id="vibration"
            title="Vibrations"
            subtitle="À la fin du minuteur et du repos"
            isOn={preferences.vibration_enabled}
            isFirst={false}
            isDisabled={isSaving}
            onToggle={(next) => void toggle("vibration_enabled", next)}
          />
          <SwitchRow
            id="timer-notification"
            title="Notifications de minuteur"
            subtitle="Prévenir quand l'app est en arrière-plan"
            note={canNotify ? undefined : "Non disponible sur ce navigateur."}
            isOn={preferences.timer_notification_enabled}
            isFirst={false}
            isDisabled={isSaving || !canNotify}
            onToggle={(next) => void toggle("timer_notification_enabled", next)}
          />
        </div>

        {refused && (
          <p
            role="alert"
            className="rounded-btn bg-status-missed/10 p-3 text-sm font-semibold"
          >
            Ton téléphone a refusé les notifications. Tu peux les autoriser dans
            ses réglages.
          </p>
        )}

        {error !== null && <ErrorState title={error} />}

        {/* PRF-04 explains the phone, NOT-08 explains the bell. */}
        <p className="flex gap-2.5 rounded-btn bg-secondary/[0.07] p-3 text-[13px] leading-[1.45]">
          <Icon
            src={fromNotifications ? bellIcon : alertIcon}
            className="size-[18px] shrink-0 text-secondary"
          />
          {fromNotifications ? (
            <span>
              <b>
                Ces réglages ne concernent que les minuteurs pendant la séance.
              </b>{" "}
              La cloche affiche toujours les séances à confirmer, les séances
              manquées, les programmes terminés et les records.
            </span>
          ) : (
            <span>
              <b>Selon ton téléphone.</b> Certaines fonctions dépendent du
              téléphone et du navigateur. Sur iPhone (Safari), la vibration peut
              ne pas fonctionner. Les notifications demandent ton autorisation.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default SoundSettingsPage;
