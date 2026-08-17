import { useEffect, useRef, useState } from "react";
import { isSafeAdvertisementUrl, recordAdvertisementEvent, requestAdvertisementDecision } from "../../services/advertisementService";

const AdBanner = ({ placement = "home", className = "" }) => {
  const rootRef = useRef(null);
  const impressionSentRef = useRef(false);
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const result = await requestAdvertisementDecision({ type: "banner", placement });
        if (active && result?.advertisement?.mediaUrl) setDecision(result);
      } catch { if (active) setDecision(null); }
    };
    void load();
    return () => { active = false; };
  }, [placement]);

  useEffect(() => {
    const element = rootRef.current;
    if (!element || !decision?.decisionToken || impressionSentRef.current) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= 0.5)) return;
      impressionSentRef.current = true;
      void recordAdvertisementEvent({ decisionToken: decision.decisionToken, eventType: "impression" });
      observer.disconnect();
    }, { threshold: [0.5] });
    observer.observe(element);
    return () => observer.disconnect();
  }, [decision]);

  if (!decision?.advertisement || !isSafeAdvertisementUrl(decision.advertisement.mediaUrl)) return null;
  const ad = decision.advertisement;
  const canOpen = isSafeAdvertisementUrl(ad.clickUrl);
  const handleClick = () => {
    if (!canOpen) return;
    void recordAdvertisementEvent({ decisionToken: decision.decisionToken, eventType: "click" });
    window.open(ad.clickUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <aside ref={rootRef} className={`relative overflow-hidden rounded-2xl border border-white/10 bg-[#21172d] ${className}`} aria-label="Nội dung được tài trợ">
      <button type="button" onClick={handleClick} disabled={!canOpen} className="block w-full text-left disabled:cursor-default">
        <img src={ad.mediaUrl} alt={ad.title} className="aspect-[6/1] min-h-[96px] w-full object-cover sm:min-h-[112px]" onError={(event) => { event.currentTarget.closest("aside")?.classList.add("hidden"); }} />
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">Được tài trợ</span>
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-10 text-sm font-semibold text-white">{ad.title}<span className="ml-2 font-normal text-white/70">· {ad.advertiserName}</span></span>
      </button>
    </aside>
  );
};

export default AdBanner;
