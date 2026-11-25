import { Link, useLocation } from "react-router";
import { describeBell, formatUnreadCount } from "shared";

type Props = {
  unreadCount: number;
};

// Screen NOT-01: the bell of the header, left of the avatar (D-01). The
// badge shows the number of unread notifications, "9+" beyond nine; with
// none, there is no badge at all (NOT-01b).
// The bell itself is a provisional square: the 29 icons of Impulsion hold
// no bell (noted in the journal).
function NotificationBell({ unreadCount }: Props) {
  const location = useLocation();

  return (
    <Link
      to="/notifications"
      state={{ from: location.pathname }}
      className="relative flex size-tap items-center justify-center text-secondary"
    >
      <span
        aria-hidden="true"
        className="size-6 rounded-ctl border-2 border-current"
      />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-neutral px-1 text-xs font-bold text-neutral-content"
        >
          {formatUnreadCount(unreadCount)}
        </span>
      )}
      <span className="sr-only">{describeBell(unreadCount)}</span>
    </Link>
  );
}

export default NotificationBell;
