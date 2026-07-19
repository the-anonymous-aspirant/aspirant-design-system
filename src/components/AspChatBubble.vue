<script setup>
import { computed } from 'vue'

// AspChatBubble — one message in an AspChatArea stream (docs/COMPONENTS.md §7).
//
// SIDES (§3.12 ruling, ratified): the operator's own messages sit right and
// carry the brand tint; everything the system produced -- agent, tool, system,
// cron -- sits left on a recessed inner surface. Side is derived from `kind`
// rather than passed, so a caller cannot render an agent message as the
// operator's by setting the wrong prop.
//
// BOTH VARIANTS ARE SURFACE-SETTERS (amendment #9766): each declares its
// background and its ink together, and neither inherits ambient ink. The
// sender tag and timestamp inside a bubble take the bubble's ink.
//
// WHY THE OWN BUBBLE IS AN OPAQUE RAMP STEP AND NOT --brand-primary-alpha:
// the ruling names the alpha token, and an alpha fill composites over whatever
// is beneath it -- so its contrast is a function of a backdrop the component
// cannot see. Measured across the six real backdrops, NO single ink survives:
// black is 4.15:1 on the dark page, white is 1.55:1 on the light page. The ink
// would have to flip by backdrop. That is the #2417/#2419 mechanism.
//
// --brand-primary-200 (#ffe082) is the alpha composited over white to within
// (255,224,130) vs (255,216,125) -- visually the ruling's own appearance, but
// OPAQUE and with no dark override, so the result is identical wherever the
// area is dropped. Ink is --text-on-fixed-light, exactly as AspButton's primary
// does it: brand amber is light in every theme, so its ink must not flip
// (#2417). Measured 7.77:1, with --text-muted timestamps at 4.73:1.
//
// The inbound side keeps --surface-card-inner as the ruling names it, but the
// AREA supplies the opaque surface it composites over (see AspChatArea). That
// token is a BLACK 30% wash in light and a WHITE 6% wash in dark -- opposite
// polarities -- so over an ambient light page it lands at 3.82:1 with 2.85:1
// timestamps. Over the area's own surface it is 13.54:1 / 9.05:1.

const props = defineProps({
  /**
   * Who produced the message. Drives the side, the fill and the ink.
   * `operator` and `user` are the own-side roles per the §3.12 ruling.
   */
  kind: {
    type: String,
    default: 'agent',
    validator: (v) => ['operator', 'user', 'agent', 'tool', 'system', 'cron'].includes(v),
  },
  /** Display name of the sender — rendered as the amber tag on inbound bubbles. */
  sender: { type: String, default: null },
  /** Pre-formatted timestamp. Formatting is the caller's business, not ours. */
  timestamp: { type: String, default: null },
  /** Renders the streaming caret after the body. */
  streaming: { type: Boolean, default: false },
})

const isOwn = computed(() => props.kind === 'operator' || props.kind === 'user')
</script>

<template>
  <li
    class="chat-bubble"
    :class="isOwn ? 'chat-bubble--own' : 'chat-bubble--inbound'"
    :data-kind="kind"
  >
    <div class="chat-bubble__body">
      <!-- The tag names the sender for everyone, not just sighted users: on the
           inbound side the amber colour is the only other cue for who spoke. -->
      <span v-if="sender" class="chat-bubble__sender">{{ sender }}</span>

      <div class="chat-bubble__content">
        <slot />
        <span v-if="streaming" class="chat-bubble__caret" aria-hidden="true" />
      </div>

      <time v-if="timestamp" class="chat-bubble__time">{{ timestamp }}</time>
    </div>
  </li>
</template>

<style scoped>
.chat-bubble {
  display: flex;
  /* Mobile-first: bubbles are near-full-width on a phone, where a 75% cap would
     waste the only axis that is scarce. The cap arrives with the room for it. */
  max-width: 100%;
}

.chat-bubble--own {
  justify-content: flex-end;
}

.chat-bubble--inbound {
  justify-content: flex-start;
}

.chat-bubble__body {
  min-width: 0;
  padding: var(--space-xs) var(--space-sm);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

/*
 * Own side. Opaque by construction — see the header note. The ink is declared
 * here with the background, not inherited, because this element establishes a
 * surface whose polarity is fixed while the ambient one flips.
 */
.chat-bubble--own .chat-bubble__body {
  background: var(--brand-primary-200);
  color: var(--text-on-fixed-light);
}

/*
 * Inbound side. --surface-card-inner is a translucent wash and is MEANT to be:
 * it reads as a recess in the area's surface. It is legible because the area
 * guarantees an opaque surface beneath it, not because the token is safe on its
 * own -- so this is not a standalone component, and outside an AspChatArea it
 * can land sub-AA. The known-bad fixture strips the area's surface and restores
 * the literal ruling tokens, so the probe fails if anyone reinstates them here.
 */
.chat-bubble--inbound .chat-bubble__body {
  background: var(--surface-card-inner);
  color: inherit;
}

.chat-bubble__sender {
  display: block;
  color: var(--brand-primary);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
}

/*
 * The amber sender tag is the #2419 trap: amber ink is 1.41:1 on the light page
 * and only safe on a dark surface. On the own bubble the surface is a light
 * amber, so the tag would be amber-on-amber. It takes the bubble's own ink and
 * leans on weight instead — the tag is still distinguished, just not by hue.
 */
.chat-bubble--own .chat-bubble__sender {
  color: inherit;
  opacity: 0.9;
}

.chat-bubble__content {
  overflow-wrap: anywhere;
}

.chat-bubble__time {
  display: block;
  /* Derives from currentColor, so it follows whichever ink the bubble set
     rather than an absolute grey (#2418). Measured 4.73:1 on the own fill and
     9.25:1 / 6.44:1 inbound. */
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.chat-bubble__caret {
  display: inline-block;
  width: 0.5em;
  height: 1em;
  margin-inline-start: 2px;
  background: currentColor;
  vertical-align: text-bottom;
  animation: chat-bubble-blink 1s step-end infinite;
}

@keyframes chat-bubble-blink {
  50% {
    opacity: 0;
  }
}

/* Respecting the OS setting is not optional for a caret that never stops. */
@media (prefers-reduced-motion: reduce) {
  .chat-bubble__caret {
    animation: none;
  }
}

/* The width cap lands once there is width to spare. */
@media (min-width: 40rem) {
  .chat-bubble__body {
    max-width: 75%;
  }
}
</style>
