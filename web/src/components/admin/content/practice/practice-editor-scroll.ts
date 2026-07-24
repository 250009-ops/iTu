/** Capture/restore scroll so publish/save re-renders don't jump the viewport. */

export type ScrollSnapshot =
  | { kind: "window"; top: number; left: number }
  | { kind: "element"; el: HTMLElement; top: number };

export function captureScroll(el?: HTMLElement | null): ScrollSnapshot {
  if (el) {
    return { kind: "element", el, top: el.scrollTop };
  }
  return {
    kind: "window",
    top: typeof window !== "undefined" ? window.scrollY : 0,
    left: typeof window !== "undefined" ? window.scrollX : 0,
  };
}

export function restoreScroll(snapshot: ScrollSnapshot) {
  const apply = () => {
    if (snapshot.kind === "element") {
      if (snapshot.el.isConnected) {
        snapshot.el.scrollTop = snapshot.top;
      }
      return;
    }
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: snapshot.top,
        left: snapshot.left,
        behavior: "auto",
      });
    }
  };

  apply();
  requestAnimationFrame(() => {
    apply();
    requestAnimationFrame(apply);
  });
}

/** @deprecated Prefer captureScroll/restoreScroll — kept for any stray imports. */
export function scrollPracticeEditorToTop() {
  if (typeof window === "undefined") return;
  window.scrollTo({ top: 0, behavior: "smooth" });
}
