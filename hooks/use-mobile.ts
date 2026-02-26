import { useEffect, useLayoutEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;
const XL_BREAKPOINT = 1280;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}

export function useIsXl(): boolean | undefined {
  const [isXl, setIsXl] = useState<boolean | undefined>(undefined);

  // useLayoutEffect so the navbar (and any consumer) gets the correct value
  // before first paint, so animations and layout run without waiting for interaction
  useLayoutEffect(() => {
    const mql = window.matchMedia(`(min-width: ${XL_BREAKPOINT}px)`);
    const onChange = () => setIsXl(window.innerWidth >= XL_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsXl(window.innerWidth >= XL_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isXl;
}
