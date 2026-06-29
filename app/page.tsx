import { BrandHeader } from "./components/site/BrandHeader";
import { MarketingView } from "./components/MarketingView";
import { C } from "./lib/theme";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        // The hero glow lives on the page wrapper (not the hero box) so it spans
        // up BEHIND the transparent sticky navbar. Removes the visible seam where
        // flat canvas behind the nav used to meet the tinted hero just below it.
        background: `radial-gradient(120% 900px at 92% -70px, ${C.brandTint} 0%, ${C.canvas} 56%)`,
        color: C.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <BrandHeader />
      <MarketingView />
    </div>
  );
}
