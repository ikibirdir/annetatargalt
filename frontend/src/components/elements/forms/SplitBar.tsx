"use client";

import { useRef } from "react";
import { classes } from "@/utils/react";
import { moveBorder } from "@/utils/split";
import { format } from "@/utils/string";
import { uiText } from "@/utils/ui-text";
import type { Locale } from "@/utils/locale";

export interface SplitPart {
  /** The cause's or organization's own key: labels can repeat, or be empty. */
  id: string | number;
  label: string;
  share: number;
}

interface SplitBarProps {
  /** The chosen ones, in order, each with its share; two or more. */
  parts: SplitPart[];
  onChange: (shares: number[]) => void;
  locale: Locale;
}

/**
 * The whole split as one bar: a part per choice, with its name and share
 * where there's room, and a handle between each two that moves money only
 * between them. The total stays 100%, and every part keeps at least 1%.
 * Handles are sliders for the keyboard too: arrows move by 1%, with Shift by
 * 5%.
 */
export default function SplitBar({ parts, onChange, locale }: SplitBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  // How far from its handle's centre the pointer took hold of it, so a drag
  // moves the border by as much as the pointer moves, and a press alone
  // (a tap, on a phone) doesn't move it at all.
  const grip = useRef(0);
  const shares = parts.map(({ share }) => share);
  // Where each handle sits: the running total up to it.
  const borders = shares
    .slice(0, -1)
    .map((_, index) =>
      shares.slice(0, index + 1).reduce((sum, share) => sum + share, 0),
    );

  function moveTo(index: number, clientX: number) {
    const bar = barRef.current;
    if (!bar) return;
    const { left, width } = bar.getBoundingClientRect();
    if (!width) return;
    onChange(moveBorder(shares, index, ((clientX - left) / width) * 100));
  }

  return (
    <div ref={barRef} className="relative my-2 h-16 touch-none select-none">
      <div className="flex h-full overflow-hidden rounded-lg">
        {parts.map((part) => (
          <div
            key={part.id}
            className="@container flex flex-none flex-col items-center justify-center overflow-hidden bg-primary-100 text-center text-primary-900"
            style={{ flexBasis: `${part.share}%` }}
          >
            {/* Its name, small, over its share: two lines at most,
                broken only between words, and cut short where it doesn't
                fit; left out where there's room for hardly a letter. */}
            <div className="hidden w-full px-2.5 @min-[3.5rem]:block">
              <p className="line-clamp-2 text-[11px] leading-[13px] font-medium text-ellipsis">
                {part.label}
              </p>
            </div>
            {/* Its share, wherever it fits between the handles, which reach
                7px into it: 24px wide with one digit, 33px with two. */}
            <span
              className={classes(
                part.share < 10 ? "@min-[38px]:inline" : "@min-[47px]:inline",
                "hidden text-sm leading-5 font-bold whitespace-nowrap",
              )}
            >
              {part.share}%
            </span>
          </div>
        ))}
      </div>
      {borders.map((border, index) => {
        const left = parts[index];
        const right = parts[index + 1];
        return (
          <div
            key={`${left.id}/${right.id}`}
            role="slider"
            tabIndex={0}
            aria-label={format(uiText(locale).splitBorder, {
              left: left.label,
              right: right.label,
            })}
            aria-valuemin={1}
            aria-valuemax={left.share + right.share - 1}
            aria-valuenow={left.share}
            aria-valuetext={`${left.label} ${left.share}%, ${right.label} ${right.share}%`}
            className="absolute -top-2 -bottom-2 -ml-4 flex w-8 cursor-ew-resize touch-none justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            style={{ left: `${border}%` }}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const { left, width } =
                event.currentTarget.getBoundingClientRect();
              grip.current = event.clientX - (left + width / 2);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                moveTo(index, event.clientX - grip.current);
              }
            }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 5 : 1;
              const moves: Record<string, number> = {
                ArrowLeft: border - step,
                ArrowDown: border - step,
                ArrowRight: border + step,
                ArrowUp: border + step,
                Home: 0,
                End: 100,
              };
              const position = moves[event.key];
              if (typeof position !== "number") return;
              event.preventDefault();
              onChange(moveBorder(shares, index, position));
            }}
          >
            {/* In the site's sliders' dark green. */}
            <span className="block h-full w-3.5 rounded-lg bg-primary-600 shadow-md" />
          </div>
        );
      })}
    </div>
  );
}
