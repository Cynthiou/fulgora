import { Link } from "react-router";
import {
  formatNotificationDate,
  getNotificationLink,
  NOTIFICATION_LABELS,
  type NotificationItem,
} from "shared";

type Props = {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
};

const SYMBOL_CLASSES: Record<string, string> = {
  session_to_confirm: "text-status-pending",
  session_missed: "text-status-missed",
  program_finished: "text-secondary",
  personal_record: "text-status-done",
};

// Screen NOT-02: one line of the list. Unread is told by a left bar, a grey
// background, a bold title and the words "● NON LUE": never the colour
// alone (RM-064). Touching it opens what it talks about and reads it.
function NotificationRow({ item, onOpen }: Props) {
  const isUnread = item.read_at === null;
  const { symbol } = NOTIFICATION_LABELS[item.type];
  const link = getNotificationLink(item);

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`flex size-8 shrink-0 items-center justify-center rounded-ctl border border-base-300 font-bold ${
          SYMBOL_CLASSES[item.type] ?? ""
        }`}
      >
        {symbol}
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={`truncate ${isUnread ? "font-display text-display-sm" : ""}`}
        >
          {item.title}
        </span>
        {item.message !== null && (
          <span className="text-sm text-muted">{item.message}</span>
        )}
        {isUnread && (
          <span className="text-overline uppercase">
            <span aria-hidden="true">● </span>Non lue
          </span>
        )}
      </span>
      <span className="shrink-0 text-sm text-muted">
        {formatNotificationDate(item.created_at)}
      </span>
    </>
  );

  const className = `flex w-full items-start gap-3 border-l-4 p-3 text-left ${
    isUnread ? "border-l-neutral bg-soft" : "border-l-transparent"
  }`;

  return (
    <li className="border-b border-base-300 last:border-b-0">
      {link === null ? (
        // Nothing to open yet (programs and records come later)
        <button
          type="button"
          onClick={() => onOpen(item)}
          className={className}
        >
          {content}
        </button>
      ) : (
        <Link to={link} onClick={() => onOpen(item)} className={className}>
          {content}
        </Link>
      )}
    </li>
  );
}

export default NotificationRow;
