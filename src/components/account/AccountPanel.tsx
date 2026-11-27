import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * AccountPanel — the framed content card every account section renders into.
 *
 * One shell for every section is what keeps the dashboard reading as a
 * single designed surface: identical eyebrow, identical title scale, one
 * header rule, one padding rhythm. Sections only ever supply content.
 */

interface AccountPanelProps {
  /** DOM id, also used to label the region for screen readers. */
  id: string;
  /** Small uppercase label above the title. */
  eyebrow: string;
  title: ReactNode;
  /** Right-hand metadata in the header, usually a count. */
  meta?: ReactNode;
  /** Optional header action, usually a link. */
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function AccountPanel({
  id,
  eyebrow,
  title,
  meta,
  action,
  children,
  className,
}: AccountPanelProps) {
  const titleId = `${id}-title`;

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn("border border-line bg-floral", className)}
    >
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-line px-5 py-5 sm:px-7 sm:py-6">
        <div className="min-w-0">
          <p className="ap-eyebrow flex items-center gap-3 text-burnt">
            <span aria-hidden="true" className="h-px w-6 bg-burnt/50" />
            {eyebrow}
          </p>
          <h2 id={titleId} className="mt-2.5 text-[1.5rem] sm:text-[1.85rem]">
            {title}
          </h2>
        </div>

        {(meta || action) && (
          <div className="flex shrink-0 items-center gap-5">
            {meta && <p className="ap-eyebrow text-ink/40">{meta}</p>}
            {action}
          </div>
        )}
      </header>

      <div className="p-5 sm:p-7">{children}</div>
    </section>
  );
}

/**
 * AccountCard — the smaller card used inside a panel for a single idea:
 * the latest order, a saved address, a settings group.
 *
 * `header` and `footer` are optional slots so each card can carry exactly
 * the furniture it needs (a status pill, a default badge, a summary row)
 * without the shared shell guessing.
 */
interface AccountCardProps {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  /** Removes the body padding — for cards that manage their own rows. */
  flush?: boolean;
  className?: string;
}

export function AccountCard({ header, footer, children, flush, className }: AccountCardProps) {
  return (
    <div className={cn("flex flex-col border border-line bg-surface/50", className)}>
      {header && (
        <div className="border-b border-line px-5 py-4">{header}</div>
      )}
      <div className={cn("flex-1", flush ? "" : "px-5 py-5")}>{children}</div>
      {footer && <div className="border-t border-line bg-floral px-5 py-4">{footer}</div>}
    </div>
  );
}
