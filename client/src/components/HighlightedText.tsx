import { Fragment } from "react";

type Props = {
  text: string;
  // The searched term; empty = nothing to highlight.
  term: string;
};

// Lowercase without accents, character by character: "É" -> "e".
// Each character keeps its position, so the match found in the simplified
// text points to the same characters in the original one.
function simplify(characters: string[]): string {
  return characters
    .map((character) => {
      const base = character
        .normalize("NFD")
        .replace(/\p{M}/gu, "")
        .toLowerCase();
      return base === "" ? character : base.charAt(0);
    })
    .join("");
}

// Writes the text with every occurrence of the term in bold, whatever the
// case and the accents. Plain React elements: no HTML injected.
function HighlightedText({ text, term }: Props) {
  const trimmed = term.trim();
  if (trimmed === "") {
    return <>{text}</>;
  }

  const characters = [...text];
  const haystack = simplify(characters);
  const needle = simplify([...trimmed]);
  const parts: { value: string; isMatch: boolean }[] = [];

  let cursor = 0;
  let found = haystack.indexOf(needle, cursor);
  while (found !== -1) {
    if (found > cursor) {
      parts.push({
        value: characters.slice(cursor, found).join(""),
        isMatch: false,
      });
    }
    parts.push({
      value: characters.slice(found, found + needle.length).join(""),
      isMatch: true,
    });
    cursor = found + needle.length;
    found = haystack.indexOf(needle, cursor);
  }
  if (cursor < characters.length) {
    parts.push({ value: characters.slice(cursor).join(""), isMatch: false });
  }

  return (
    <>
      {parts.map((part, index) =>
        part.isMatch ? (
          // biome-ignore lint/suspicious/noArrayIndexKey: the parts never reorder
          <strong key={index} className="font-bold">
            {part.value}
          </strong>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: the parts never reorder
          <Fragment key={index}>{part.value}</Fragment>
        ),
      )}
    </>
  );
}

export default HighlightedText;
