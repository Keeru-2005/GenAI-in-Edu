import { useEffect } from 'react';
import mermaid from 'mermaid';

export function useMermaid(ref, className) {
  useEffect(() => {
    if (className === "mermaid" && ref.current) {
      try {
        mermaid.initialize({ startOnLoad: true, theme: "dark" });
        mermaid.contentLoaded();
      } catch (e) {
        console.error("Mermaid init error:", e);
      }
    }
  }, [className, ref]);
}