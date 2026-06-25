import { BrandHeader } from "./components/site/BrandHeader";
import { MarketingView } from "./components/MarketingView";

export default function Page() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F1F5F9",
        color: "#0B1221",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <BrandHeader />
      <MarketingView />
    </div>
  );
}
