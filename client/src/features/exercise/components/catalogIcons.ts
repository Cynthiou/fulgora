import armsIcon from "../../../assets/icons/categories/arms.svg";
import backIcon from "../../../assets/icons/categories/back.svg";
import cardioCategoryIcon from "../../../assets/icons/categories/cardio.svg";
import chestIcon from "../../../assets/icons/categories/chest.svg";
import coreIcon from "../../../assets/icons/categories/core.svg";
import legsIcon from "../../../assets/icons/categories/legs.svg";
import shouldersIcon from "../../../assets/icons/categories/shoulders.svg";
import stretchingIcon from "../../../assets/icons/categories/stretching.svg";
import barbellIcon from "../../../assets/icons/equipment/barbell.svg";
import bodyweightIcon from "../../../assets/icons/equipment/bodyweight.svg";
import cableIcon from "../../../assets/icons/equipment/cable.svg";
import cardioEquipmentIcon from "../../../assets/icons/equipment/cardio.svg";
import dumbbellIcon from "../../../assets/icons/equipment/dumbbell.svg";
import machineIcon from "../../../assets/icons/equipment/machine.svg";
import advancedIcon from "../../../assets/icons/levels/advanced.svg";
import beginnerIcon from "../../../assets/icons/levels/beginner.svg";
import intermediateIcon from "../../../assets/icons/levels/intermediate.svg";

// The drawn icons of the catalog (from Impulsion), found by their code.
// These are illustrations with their own colors: shown as images, not masks.
export const CATEGORY_ICONS: Record<string, string> = {
  arms: armsIcon,
  back: backIcon,
  cardio: cardioCategoryIcon,
  chest: chestIcon,
  core: coreIcon,
  legs: legsIcon,
  shoulders: shouldersIcon,
  stretching: stretchingIcon,
};

export const EQUIPMENT_ICONS: Record<string, string> = {
  barbell: barbellIcon,
  bodyweight: bodyweightIcon,
  cable: cableIcon,
  cardio: cardioEquipmentIcon,
  dumbbell: dumbbellIcon,
  machine: machineIcon,
};

export const DIFFICULTY_ICONS: Record<string, string> = {
  beginner: beginnerIcon,
  intermediate: intermediateIcon,
  advanced: advancedIcon,
};
