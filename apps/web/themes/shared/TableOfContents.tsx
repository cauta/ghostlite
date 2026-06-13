import type { TocEntry } from "../theme.types";

interface Props {
  toc: TocEntry[];
  className?: string;
  headingClassName?: string;
  listClassName?: string;
  itemClassName?: string;
  linkClassName?: string;
  subLinkClassName?: string;
}

export function TableOfContents({
  toc,
  className,
  headingClassName,
  listClassName,
  itemClassName,
  linkClassName,
  subLinkClassName,
}: Props) {
  if (toc.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className={className}>
      <p className={headingClassName}>On this page</p>
      <ol className={listClassName}>
        {toc.map((entry) => (
          <li key={entry.id} className={itemClassName}>
            <a
              href={`#${entry.id}`}
              className={entry.level === 3 ? subLinkClassName : linkClassName}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
