import { Link, useLocation } from "react-router";
import { describeBell } from "shared";
import bellIcon from "../../../assets/icons/ui/app/bell.svg";
import Icon from "../../../components/Icon";

type Props = {
  unreadCount: number;
};

// Screen NOT-01: the bell of the header, left of the avatar (D-01). An
// orange dot of 9 px, ringed with the page colour, says there is something
// unread; with none, there is no dot at all (NOT-01b). The number itself is
// read aloud, as the mockup shows no figure on the dot.
function NotificationBell({ unreadCount }: Props) {
  const location = useLocation();

  return (
    <Link
      to="/notifications"
      state={{ from: location.pathname }}
      className="relative grid size-tap place-items-center"
    >
      <Icon src={bellIcon} className="size-[22px]" />
      {unreadCount > 0 && (
        <span
          aria-hidden="true"
          className="absolute right-2 top-2 size-[9px] rounded-full border-2 border-base-200 bg-primary"
        />
      )}
      <span className="sr-only">{describeBell(unreadCount)}</span>
    </Link>
  );
}

export default NotificationBell;
