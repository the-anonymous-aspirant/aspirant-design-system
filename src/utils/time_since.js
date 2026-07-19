/**
 * The "how long" format rule — system_3 #2272 / #2379.
 *
 * Single largest unit, floored, never compound:
 *
 *     < 60s   ->  Xs
 *     < 60m   ->  Xm
 *     < 24h   ->  Xh
 *     else    ->  Xd
 *
 * "No compound" is the whole point, not a simplification: `1h 22m` reads as
 * prose, `1h` reads as a terminal field, and every one of these sits in a dense
 * table where the column has to scan (§2.7). A formatter that grows a second
 * unit "just for the near cases" breaks the column alignment it exists to keep.
 */

export const SECOND = 1
export const MINUTE = 60
export const HOUR = 3600
export const DAY = 86400

/**
 * @param {number} seconds elapsed magnitude, already non-negative
 * @returns {string} e.g. `45s`, `22m`, `3h`, `9d`
 */
export const formatMagnitude = (seconds) => {
  // Floor first, then compare. Comparing the float and flooring afterwards puts
  // 59.7s in the seconds branch and prints "60s" -- a value the rule says is
  // unreachable, and the kind of off-by-one that only shows up at 3am in a log
  // table.
  const s = Math.floor(Math.max(0, seconds))
  if (s < MINUTE) return `${s}s`
  if (s < HOUR) return `${Math.floor(s / MINUTE)}m`
  if (s < DAY) return `${Math.floor(s / HOUR)}h`
  return `${Math.floor(s / DAY)}d`
}

/** Coerce the several shapes a caller may hold a timestamp in. */
export const toMillis = (value) => {
  if (value == null) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.getTime()
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const parsed = Date.parse(String(value))
  return Number.isNaN(parsed) ? null : parsed
}

/**
 * Render one reading.
 *
 * @param {object} opts
 * @param {'elapsed'|'duration'|'countdown'} opts.variant
 * @param {number|null} opts.millis the reference instant, epoch ms
 * @param {number|null} opts.seconds explicit magnitude (duration only)
 * @param {number} opts.now epoch ms
 * @returns {{text: string, iso: string|null, seconds: number}|null}
 */
export const formatTimeSince = ({ variant, millis, seconds, now }) => {
  if (variant === 'duration' && typeof seconds === 'number' && Number.isFinite(seconds)) {
    return { text: formatMagnitude(seconds), iso: null, seconds: Math.floor(Math.max(0, seconds)) }
  }
  if (millis == null) return null

  const deltaSeconds = (now - millis) / 1000
  const iso = new Date(millis).toISOString()

  if (variant === 'countdown') {
    // A countdown that has passed its instant is not negative time, it is due.
    // Printing "next -3m" would be worse than useless in a cron table.
    const remaining = -deltaSeconds
    if (remaining <= 0) return { text: 'due', iso, seconds: 0 }
    return { text: `next ${formatMagnitude(remaining)}`, iso, seconds: Math.floor(remaining) }
  }

  const magnitude = Math.abs(deltaSeconds)
  if (variant === 'duration') {
    return { text: formatMagnitude(magnitude), iso, seconds: Math.floor(magnitude) }
  }

  // elapsed. A future instant under `elapsed` is a caller error rather than a
  // state to render creatively -- "in Xm" keeps it truthful without inventing a
  // fourth variant.
  if (deltaSeconds < 0) {
    return { text: `in ${formatMagnitude(magnitude)}`, iso, seconds: Math.floor(magnitude) }
  }
  return { text: `${formatMagnitude(magnitude)} ago`, iso, seconds: Math.floor(magnitude) }
}

/**
 * How often a live reading needs to re-render, in ms.
 *
 * Scaled to the magnitude on purpose: a timestamp from nine days ago does not
 * need a 1Hz timer, and a table with 200 rows of them would otherwise wake the
 * main thread 200 times a second to redraw text that changes daily.
 */
export const tickInterval = (seconds) => {
  if (seconds < MINUTE) return 1000
  if (seconds < HOUR) return 60 * 1000
  return 60 * 60 * 1000
}
