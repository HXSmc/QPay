import { BrandHeader } from "./components/site/BrandHeader";
import { MarketingView } from "./components/MarketingView";
import { C } from "./lib/theme";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.canvas,
        color: C.text,
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <BrandHeader />
      <MarketingView />
    </div>
  );
}
