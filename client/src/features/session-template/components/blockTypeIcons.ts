import type { BlockType } from "shared";
import dumbbellIcon from "../../../assets/icons/ui/v3/dumbbell.svg";
import flameIcon from "../../../assets/icons/ui/v3/flame.svg";
import pencilIcon from "../../../assets/icons/ui/v3/pencil.svg";
import repeatIcon from "../../../assets/icons/ui/v3/repeat.svg";
import stretchIcon from "../../../assets/icons/ui/v3/stretch.svg";
import timerIcon from "../../../assets/icons/ui/v3/timer.svg";
import trophyIcon from "../../../assets/icons/ui/v3/trophy.svg";
import zapIcon from "../../../assets/icons/ui/v3/zap.svg";

// The Lucide icon of every type of block (handoff des blocs, table 2.1).
// The note keeps a pencil: no new note can be created, but a session saved
// with one must still show it (RM-020).
export const BLOCK_TYPE_ICONS: Record<BlockType, string> = {
  classic: dumbbellIcon,
  circuit: repeatIcon,
  amrap: timerIcon,
  for_time: zapIcon,
  warm_up: flameIcon,
  stretching: stretchIcon,
  challenge: trophyIcon,
  note: pencilIcon,
};
