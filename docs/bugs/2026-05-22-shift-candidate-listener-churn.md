# Bug Report: Hold-Shift Candidate Entry Silently Wrote Digits

- **Date discovered:** 2026-05-22
- **Severity:** High (core input UX broken)
- **Component:** `apps/web/src/App.tsx`
- **Fix commit:** `a37457a`
- **Decision record:** [DL-0010 in DECISION-LOG.md](../guides/DECISION-LOG.md)
- **Status:** Fixed and verified

## Summary

Holding Shift while pressing a digit was supposed to write a pencil-mark candidate to the selected cell(s). Instead, the app wrote a full digit, overwriting whatever was there. The mode pill in the UI even flipped briefly to "candidate" when Shift went down, making the failure feel inconsistent and arbitrary.

The root cause was that our global window keyboard listeners were being torn down and re-attached on essentially every render. Between the Shift `keydown` and the next digit `keydown`, the browser delivered a synthetic Shift `keyup` because no listener was tracking the held modifier across the gap. By the time the digit event arrived, `event.shiftKey` was `false` from the browser's own perspective.

## How it manifested

1. User selects one or more cells.
2. User holds Shift. UI pill flips to "candidate".
3. User presses `1`, `2`, `3` while still physically holding Shift.
4. Cells receive `set_digit` actions, not `toggle_candidate`.
5. Backend log confirms the action type. UI pill is back on "digit" by the time the digit event fires (often unnoticed by the user).

Side oddity: a third-party keyboard event tester on the same machine showed `shiftKey: true` on the digit `keydown`. So the OS and browser were behaving correctly outside our app.

## Why this was hard to track down

Several factors combined:

1. **The browser said `event.shiftKey: false`.** That's normally the end of the discussion. We first chased OS-level causes — Sticky Keys, Filter Keys, keyboard manufacturer software, AutoHotKey, PowerToys — none of which were active. The browser-reported value of `shiftKey` is usually treated as ground truth.
2. **The UI partially lied.** The mode pill flipped to "candidate" the instant Shift went down, suggesting our state tracking worked. It did — for a few milliseconds — before the synthetic `keyup` arrived and flipped it back. The user only sees the post-keyup state when looking at the pill alongside their typed digit.
3. **The external tester pointed away from the app.** Standard debugging instinct ("reproduce in isolation") was followed; the third-party tester worked fine. That should have immediately suggested "our app does something the tester doesn't," but it was easy to misread as "OS is fine, must be a different issue."
4. **The teardown window is microseconds.** Between `removeEventListener` and the next `addEventListener` is essentially zero observable time. There's no realistic way to step through it in DevTools and watch the synthetic `keyup` fire. We only see the consequence: subsequent reads of `event.shiftKey` come back `false`.
5. **The bug is platform-dependent.** This specific synthesized-keyup behavior on listener teardown shows up on certain combinations of browser engine + OS keyboard driver. On other machines the same code would have worked fine — making this a classic "works on my machine" defect.
6. **React's lint rule encourages the antipattern.** The default-on `react-hooks/exhaustive-deps` rule actively pushes developers toward listing every referenced value in the `useEffect` deps array, which means the listener is re-attached every time any of those values change. The lint rule is right that closure capture is a hazard, but it has no opinion on whether re-attaching a global listener for that reason is appropriate. The path of least resistance is to obey the lint rule and accept the churn.

It took adding per-effect-instance IDs and logging every `attach`/`cleanup`/`shift down`/`shift up`/`digit press` event with timestamps before the ordering — _attach → shift down → cleanup → attach → cleanup → attach → cleanup → attach → shift up → digit_ — made the cause unambiguous.

## The fix

In `apps/web/src/App.tsx`:

1. Attach `keydown`, `keyup`, `blur` listeners on `window` **exactly once on mount** (empty `useEffect` deps).
2. Store the latest closures we need (`handleDigitInput`, `clearSelectedCell`, `keyboardAnchorCell`, `redo`, `undo`) in a `keyboardHandlersRef` updated on every render.
3. The listeners read through `keyboardHandlersRef.current.*` to always see the latest values without re-attaching.
4. Maintain a `pressedKeysRef: Set<string>` to track currently-held key codes — Shift state is derived from `event.getModifierState('Shift') || pressedKeysRef.has('ShiftLeft'/'ShiftRight') || isShiftHeldRef.current`.
5. Removed `event.preventDefault()` on bare Shift `keydown` (it served no purpose and is documented as a way to confuse modifier tracking).

After the fix, the trace shows a single `attach` at startup, then no teardown for the rest of the session. Shift+digit reliably dispatches `toggle_candidate`.

## Is this a JS quirk or a React quirk?

**Mostly React, with two supporting layers underneath.** It's worth unpacking because the answer informs how we write future code:

### Layer 1 — JavaScript closures (a language behavior, not really a quirk)

In JS, a closure captures variable bindings by reference, but `useState` returns a **new value** on every render. So even though the closure binding is "live," what it points to is the snapshot of state from the render where the closure was created:

```js
function App() {
  const [count, setCount] = useState(0)
  // On the first render, this 'count' is 0.
  // On the second render, 'count' is a different variable entirely
  // (a new binding in a new function activation).
  const handler = () => console.log(count)
  // 'handler' permanently sees the render-time value of 'count'.
}
```

This is normal lexical scoping. Every other language with closures does this. It's not a quirk — it's how the language works.

### Layer 2 — React's choice to re-create the component function on every render

React's design says: "to render, call your component function again." That means `App()` runs from scratch on every state change, producing a new `handler` closure every time. Each closure sees the state from its own render. There's no built-in "this same listener now sees fresh state" mechanism, because there's no persistent listener — each render makes a new one.

This is a deliberate React design choice. Other reactive frameworks (Solid, Svelte, Vue) compile or proxy in ways that don't require re-running the component to update its event handlers, so they don't have this problem. So **the churn is induced by React's mental model, not by JS.**

### Layer 3 — React's lint rule and ecosystem norms

`react-hooks/exhaustive-deps` codifies this design into a hard rule: if your effect reads a value, list it as a dep. That's a safe default because closure staleness is a frequent foot-gun. But it's a one-size-fits-all rule that doesn't distinguish:
- Effects that genuinely need to re-run when inputs change (good: re-attach).
- Effects that just want the listener to read current state (bad: re-attach unnecessarily).

For case 2, the idiomatic escape hatch is the "latest ref pattern" (or the experimental `useEffectEvent` hook). This pattern exists, but it's underdocumented and feels like cheating, so most React code doesn't use it.

### Bottom line

**JavaScript** gives us closures-over-snapshots, which is normal.
**React** chose a programming model where component functions are re-invoked per render, which means closures are re-created per render. That's the design that creates the dilemma "stale closure or churn."
**The lint rule and ecosystem** push you toward the churn answer because it's the safe default.

So: **the listener-re-attachment pattern is a React quirk, sitting on top of normal JS closure semantics.** Calling it a "JS bug" would be unfair; calling it a "React quirk" is accurate. Calling it "a forced trade-off in React's design when you need long-lived listeners that read live state" is the most precise.

## Lessons captured (now repo policy)

1. **Global event listeners attach once.** Window/document keyboard, pointer, focus, and resize listeners must be mounted with empty `useEffect` deps and read state through refs. Do not put callbacks in the deps array of a global listener effect.
2. **Use the latest-ref pattern** when a stable listener needs access to mutable component state. Update the ref every render; the listener reads through it.
3. **Do not call `preventDefault` on bare modifier keys** (Shift, Ctrl, Alt, Meta) unless there's a verified browser default to suppress. The risk of confusing modifier tracking outweighs any benefit.
4. **Re-attaching is reserved for genuine re-subscriptions**, e.g., when the event source itself changes (target element unmounted/swapped) or when the listener configuration changes (`passive`, `capture`, `signal`). For an unchanging `window` listener, never re-attach.

## Follow-up work

- [ ] Add an integration test that simulates `Shift keydown → digit keydown → Shift keyup` against the mounted board and asserts a `toggle_candidate` event is appended.
- [ ] Audit other `useEffect` hooks in `apps/web/src` for the same pattern (global listeners with mutable deps). Currently only the keyboard effect was affected, but the pattern could recur.
- [ ] Consider extracting the latest-ref pattern into a small `useLatestRef` helper if a second use case appears, to make the intent explicit at call sites.
