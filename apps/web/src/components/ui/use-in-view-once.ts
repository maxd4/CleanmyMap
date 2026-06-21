"use client";

import { useEffect, useRef, useState } from "react";

type UseInViewOnceOptions = {
  rootMargin?: string;
  threshold?: number;
};

export function useInViewOnce<TElement extends Element>(
  options: UseInViewOnceOptions = {},
) {
  const ref = useRef<TElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    if (isInView || typeof IntersectionObserver === "undefined") {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: options.rootMargin ?? "160px 0px",
        threshold: options.threshold ?? 0.01,
      },
    );

    const element = ref.current;
    if (element) {
      observer.observe(element);
    }

    return () => observer.disconnect();
  }, [isInView, options.rootMargin, options.threshold]);

  return { ref, isInView };
}
