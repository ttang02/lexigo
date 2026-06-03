import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function usePrefersReducedMotion() {
  // Lazy init avoids a one-frame flash of motion for reduced-motion users.
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia(QUERY).matches
  );
  useEffect(() => {
    const m = window.matchMedia(QUERY);
    setReduced(m.matches);
    const onChange = (e) => setReduced(e.matches);
    m.addEventListener("change", onChange);
    return () => m.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
