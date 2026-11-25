import imageIcon from "../../../assets/icons/ui/app/image.svg";
import Icon from "../../../components/Icon";

type Props = {
  // The illustration to show, null when the exercise has none
  src: string | null;
};

// The 84 x 62 picture of a card of the catalog (04-1). Without illustration
// the mockup draws a grey box holding a small picture icon. The image is
// never cropped: it is 3:2 on a white ground, so it is shown whole.
function ExerciseThumbnail({ src }: Props) {
  if (src === null) {
    return (
      <span
        aria-hidden="true"
        className="grid h-[62px] w-21 shrink-0 place-items-center rounded-ctl border border-base-300 bg-soft text-faint"
      >
        <Icon src={imageIcon} className="size-[22px]" />
      </span>
    );
  }

  return (
    <img
      src={src}
      alt=""
      width={84}
      height={62}
      loading="lazy"
      className="h-[62px] w-21 shrink-0 rounded-ctl border border-base-300 bg-white object-contain"
    />
  );
}

export default ExerciseThumbnail;
