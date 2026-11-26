import imageIcon from "../../../assets/icons/ui/app/image.svg";
import Icon from "../../../components/Icon";

type Props = {
  // The illustration to show, null when the exercise has none
  src: string | null;
  // "form": the 70 x 52 vignette of the catalog in selection (handoff 2.3)
  variant?: "page" | "form";
};

// The 84 x 62 picture of a card of the catalog (04-1), 70 x 52 in the
// selection for a block. Without illustration the mockup draws a grey box
// holding a small picture icon, striped in the handoff of the blocks. The
// image is never cropped: it is 3:2 on a white ground, so it is shown whole.
function ExerciseThumbnail({ src, variant = "page" }: Props) {
  const isForm = variant === "form";
  const size = isForm
    ? "h-[52px] w-[70px] rounded-[6px]"
    : "h-[62px] w-21 rounded-ctl";

  if (src === null) {
    return (
      <span
        aria-hidden="true"
        className={`grid shrink-0 place-items-center ${size} ${
          isForm
            ? "bg-[repeating-linear-gradient(135deg,var(--color-stripe-a)_0_6px,var(--color-stripe-b)_6px_12px)]"
            : "border border-base-300 bg-soft text-faint"
        }`}
      >
        {!isForm && <Icon src={imageIcon} className="size-[22px]" />}
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={isForm ? 70 : 84}
      height={isForm ? 52 : 62}
      loading="lazy"
      className={`shrink-0 bg-white object-contain ${size} ${
        isForm ? "" : "border border-base-300"
      }`}
    />
  );
}

export default ExerciseThumbnail;
