import { Link } from "react-router";
import {
  formatNotificationDate,
  getNotificationLink,
  type NotificationItem,
  type NotificationType,
} from "shared";
import calendarIcon from "../../../assets/icons/ui/app/calendar.svg";
import flagIcon from "../../../assets/icons/ui/app/flag.svg";
import starIcon from "../../../assets/icons/ui/app/star.svg";
import xIcon from "../../../assets/icons/ui/app/x.svg";
import Icon from "../../../components/Icon";

type Props = {
  item: NotificationItem;
  onOpen: (item: NotificationItem) => void;
};

// The tinted square of each kind of notification (NOT-02).
const BADGES: Record<NotificationType, { icon: string; classes: string }> = {
  session_to_confirm: {
    icon: calendarIcon,
    classes: "bg-status-pending/10 text-status-pending-text",
  },
  session_missed: {
    icon: xIcon,
    classes: "bg-status-missed/10 text-status-missed-text",
  },
  program_finished: {
    icon: flagIcon,
    classes: "bg-status-done/10 text-status-done-text",
  },
  personal_record: {
    icon: starIcon,
    classes: "bg-primary/10 text-action-text",
  },
};

// Screen NOT-02: one card of the list. Unread is told by a blue bar on the
// left, a white card, a bold title and the words "● NON LUE": never the
// colour alone (RM-064). Touching it opens what it talks about and reads it.
function NotificationRow({ item, onOpen }: Props) {
  const isUnread = item.read_at === null;
  const badge = BADGES[item.type];
  const link = getNotificationLink(item);

  const content = (
    <>
      <span
        aria-hidden="true"
        className={`grid size-10 shrink-0 place-items-center rounded-card ${badge.classes}`}
      >
        <Icon src={badge.icon} className="size-[19px]" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex justify-between gap-2">
          <b className="truncate text-sm font-extrabold">{item.title}</b>
          <span className="shrink-0 text-[11px] font-medium leading-[1.45] text-muted">
            {formatNotificationDate(item.created_at)}
          </span>
        </span>
        {item.message !== null && (
          <span className="text-[13px] leading-[1.45] text-muted">
            {item.message}
          </span>
        )}
        {isUnread && (
          <span className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-secondary">
            <span aria-hidden="true">● </span>Non lue
          </span>
        )}
      </span>
    </>
  );

  const className = `flex w-full gap-3 rounded-card border border-base-300 p-3.5 text-left ${
    isUnread
      ? "bg-base-100 shadow-[inset_3px_0_0_var(--color-secondary),0_1px_2px_rgba(15,23,42,0.06)]"
      : "bg-soft"
  }`;

  return (
    <li>
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
