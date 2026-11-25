type Props = {
  // The imported SVG file, for example `import homeIcon from ".../home.svg"`.
  src: string;
  // Size classes; the color always follows the text color (currentColor).
  className?: string;
};

// Draws an interface icon in the current text color. The SVG file is used as
// a mask over a box filled with the text color, so the color comes from the
// brand classes (text-secondary, text-muted...) and no icon library is needed.
// Decorative: the text next to the icon carries the meaning.
function Icon({ src, className = "size-6" }: Props) {
  const mask = `url("${src}")`;
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 bg-current mask-center mask-no-repeat mask-contain ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  );
}

export default Icon;
