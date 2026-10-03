import './status-stack.css'

import { useStore } from '@nanostores/react'
import { type ReactNode, useState } from 'react'

import { DisclosureCaret } from '@/components/ui/disclosure-caret'
import { $paneState, setPaneOpen } from '@/store/panes'

interface StatusSectionProps {
  /** Optional right-aligned actions (text links / micro buttons). Pass
   *  `Button` with `size="micro"` + `variant="text"` or `"link"`. */
  accessory?: ReactNode
  children: ReactNode
  /** Optional inline status next to the label (running spinner, etc). */
  collapsedIndicator?: ReactNode
  defaultCollapsed?: boolean
  /** Optional glyph between the caret and the label (e.g. a `Codicon`). */
  icon?: ReactNode
  label: ReactNode
  /** Persist the user's expand/collapse choice under this key so it survives
   *  the section unmounting (event arrivals, session switches, reloads). Omit
   *  it and the state stays local to this component, as it always has. */
  persistKey?: string
  /** Compact live content stays visible while the full roster is collapsed. */
  preview?: ReactNode
}

/** Store namespace for persisted sections — keeps status-stack keys out of the
 *  ids the shell's real panes use. */
const PERSIST_PREFIX = 'status-section:'
/** Stand-in id so `useStore` below still runs (and stays memoised) when the
 *  section is not persisted. Never written to. */
const UNPERSISTED_SECTION_ID = `${PERSIST_PREFIX}__unpersisted__`

/**
 * One collapsible group inside the composer status stack. Pure chrome — header
 * (caret + label) + body — styled to match the queue exactly so every status
 * (queue, subagents, background) reads as one piece. The stack supplies the
 * outer card and the dividers between groups; this owns only its own collapse.
 *
 * With a `persistKey` the collapse flag lives in the pane store: a stored value
 * is a choice the user made, so it outranks `defaultCollapsed` on every remount
 * ("collapsed by default", not "always collapsed" — the same contract
 * `DetailPane` uses for its height override).
 */
export function StatusSection({
  accessory,
  children,
  collapsedIndicator,
  defaultCollapsed = true,
  icon,
  label,
  persistKey,
  preview
}: StatusSectionProps) {
  const [localCollapsed, setLocalCollapsed] = useState(defaultCollapsed)
  const stored = useStore($paneState(persistKey ? `${PERSIST_PREFIX}${persistKey}` : UNPERSISTED_SECTION_ID))
  // No stored value yet: seed the caller's default. Stored value: the user's
  // own expand/collapse wins, including across unmounts.
  const collapsed = persistKey ? (stored ? !stored.open : defaultCollapsed) : localCollapsed

  const toggle = () => {
    if (!persistKey) {
      setLocalCollapsed(open => !open)

      return
    }

    // `open` is the inverse of `collapsed`, so the value we persist is the flag
    // we are flipping away from right now.
    setPaneOpen(`${PERSIST_PREFIX}${persistKey}`, collapsed)
  }

  return (
    <div data-slot="status-section">
      <div className="status-section-header flex items-center gap-1 pr-1">
        <button
          aria-expanded={!collapsed}
          className="status-section-trigger flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1 text-left text-xs font-normal text-muted-foreground/92 transition-colors hover:text-foreground/90"
          onClick={toggle}
          type="button"
        >
          <DisclosureCaret className="shrink-0" open={!collapsed} size="1em" />
          {icon && <span className="status-section-icon flex shrink-0 items-center">{icon}</span>}
          <span className="min-w-0 truncate">{label}</span>
          {collapsedIndicator && <span className="flex shrink-0 items-center">{collapsedIndicator}</span>}
        </button>
        {accessory && <div className="flex shrink-0 items-center gap-1">{accessory}</div>}
      </div>
      {(!collapsed || preview) && <div className="status-section-body">{collapsed ? preview : children}</div>}
    </div>
  )
}
