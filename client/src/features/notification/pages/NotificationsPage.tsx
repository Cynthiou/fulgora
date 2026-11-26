import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import {
  getNotificationGroup,
  NOTIFICATION_GROUP_LABELS,
  type NotificationGroup,
  type NotificationItem,
} from "shared";
import bellIcon from "../../../assets/icons/ui/app/bell.svg";
import chevronRightIcon from "../../../assets/icons/ui/app/chevron-right.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
import PageHeader from "../../../components/PageHeader";
import { isAbortError } from "../../../services/api";
import NotificationRow from "../components/NotificationRow";
import {
  markAllNotificationsRead,
  markNotificationRead,
  readNotifications,
} from "../services/notificationService";

const GROUPS: NotificationGroup[] = ["week", "older"];

// Screen NOT-02: the notifications, newest first, in two groups. Touching
// one opens what it talks about and reads it; "Tout marquer lu" empties the
// badge of the bell (D-05). NOT-02v: the empty list says what will land here.
function NotificationsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is listed on purpose, it re-runs the load
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    readNotifications(controller.signal)
      .then((answer) => {
        setItems(answer.items);
        setIsLoading(false);
      })
      .catch((caught: unknown) => {
        if (isAbortError(caught)) {
          return;
        }
        setError("Impossible de charger tes notifications.");
        setIsLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);

  // Touching a notification reads it; the link opens at the same time.
  function open(item: NotificationItem) {
    if (item.read_at !== null) {
      return;
    }
    setItems((current) =>
      current.map((other) =>
        other.id === item.id
          ? { ...other, read_at: new Date().toISOString() }
          : other,
      ),
    );
    markNotificationRead(item.id).catch(() => {
      // The server did not take it: the list says the truth again.
      setAttempt((count) => count + 1);
    });
  }

  async function readAll() {
    setItems((current) =>
      current.map((item) =>
        item.read_at === null
          ? { ...item, read_at: new Date().toISOString() }
          : item,
      ),
    );
    await markAllNotificationsRead().catch(() => {
      setAttempt((count) => count + 1);
    });
  }

  const hasUnread = items.some((item) => item.read_at === null);
  // "3 non lues" under the title, as the mockup writes it (NOT-02).
  const unreadCount = items.filter((item) => item.read_at === null).length;
  const unreadLabel =
    unreadCount === 0
      ? undefined
      : `${unreadCount} non lue${unreadCount > 1 ? "s" : ""}`;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <PageHeader
        onBack={() => navigate(from)}
        title="Notifications"
        subtitle={unreadLabel}
        action={
          hasUnread ? (
            <button
              type="button"
              onClick={readAll}
              className="min-h-tap shrink-0 px-1.5 text-[13px] font-semibold text-secondary"
            >
              <span className="sr-only">Tout marquer lu</span>
              <span aria-hidden="true">Tout lire</span>
            </button>
          ) : undefined
        }
      />

      <div className="flex flex-1 flex-col gap-2 px-[18px] pt-1 pb-3.5">
        {isLoading && <LoadingState label="Chargement des notifications…" />}

        {!isLoading && error !== null && (
          <ErrorState
            title={error}
            message="Vérifie ta connexion internet, puis réessaie."
            onRetry={() => setAttempt((count) => count + 1)}
          />
        )}

        {!isLoading && error === null && items.length === 0 && (
          <EmptyState
            plain
            icon={bellIcon}
            title="Aucune notification"
            message="Tu seras prévenu ici des séances à confirmer ou manquées, des programmes terminés et de tes records."
          />
        )}

        {!isLoading &&
          error === null &&
          GROUPS.map((group) => {
            const rows = items.filter(
              (item) => getNotificationGroup(item.created_at) === group,
            );
            if (rows.length === 0) {
              return null;
            }
            return (
              <section
                key={group}
                aria-labelledby={`group-${group}`}
                className="flex flex-col gap-2"
              >
                <h2
                  id={`group-${group}`}
                  className="font-sans text-overline uppercase not-italic text-muted"
                >
                  {NOTIFICATION_GROUP_LABELS[group]}
                </h2>
                <ul className="flex flex-col gap-2">
                  {rows.map((item) => (
                    <NotificationRow key={item.id} item={item} onOpen={open} />
                  ))}
                </ul>
              </section>
            );
          })}

        {/* NOT-08: the same screen as PRF-04, with the sentence about the
            bell (US-05). */}
        <Link
          to="/profil/sons?depuis=notifications"
          className="flex h-13 items-center justify-center gap-1.5 rounded-btn border border-base-300 bg-base-100 text-sm font-bold shadow-card"
        >
          Réglages des alertes
          <Icon src={chevronRightIcon} className="size-4 text-faint" />
        </Link>
      </div>
    </div>
  );
}

export default NotificationsPage;
