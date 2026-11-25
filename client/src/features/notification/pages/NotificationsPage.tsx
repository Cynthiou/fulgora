import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  getNotificationGroup,
  NOTIFICATION_GROUP_LABELS,
  type NotificationGroup,
  type NotificationItem,
} from "shared";
import chevronLeftIcon from "../../../assets/icons/ui/chevrons/chevron-left.svg";
import EmptyState from "../../../components/EmptyState";
import ErrorState from "../../../components/ErrorState";
import Icon from "../../../components/Icon";
import LoadingState from "../../../components/LoadingState";
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

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-base-300 bg-base-100 px-2">
        <button
          type="button"
          onClick={() => navigate(from)}
          aria-label="Retour"
          className="flex size-tap items-center justify-center rounded-btn text-secondary"
        >
          <Icon src={chevronLeftIcon} className="size-7" />
        </button>
        <h1 className="flex-1 text-display-sm">Notifications</h1>
        {hasUnread && (
          <button
            type="button"
            onClick={readAll}
            className="min-h-tap px-2 font-semibold text-secondary underline"
          >
            Tout marquer lu
          </button>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4">
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
                  className="font-sans text-overline not-italic uppercase text-accent"
                >
                  {NOTIFICATION_GROUP_LABELS[group]}
                </h2>
                <ul className="overflow-hidden rounded-card border border-base-300 bg-base-100 shadow-card">
                  {rows.map((item) => (
                    <NotificationRow key={item.id} item={item} onOpen={open} />
                  ))}
                </ul>
              </section>
            );
          })}

        {/* The alert settings arrive with US-05. */}
        <p className="text-center text-sm text-muted">
          Réglages des alertes : bientôt.
        </p>
      </div>
    </div>
  );
}

export default NotificationsPage;
