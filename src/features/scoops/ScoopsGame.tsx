"use client";

import { useState } from "react";
import { usePendingRouter } from "@/components/PendingNavigation";
import RequirePlayer from "@/components/RequirePlayer";
import { usePlayerStore } from "@/features/player/store";
import { useSettingsStore } from "@/features/settings/store";
import { Mascot } from "./components/Mascot";
import { AchievementsScreen, ProfileScreen, SettingsScreen } from "./components/MoreScreens";
import { BookScreen } from "./components/BookScreen";
import { Builder } from "./components/Builder";
import { CommunityScreen } from "./components/CommunityScreen";
import { HomeScreen } from "./components/HomeScreen";
import { ShopBar } from "./components/ShopBar";
import { ShopBrand } from "./components/ShopBrand";
import { clearDraft, draftHasProgress, emptyDraft, loadDraft, type ScoopDraft } from "./draft";
import { ScoopsProvider, useScoops } from "./ScoopsProvider";
import "./scoops.css";

type Screen = "home" | "build" | "book" | "community" | "badges" | "profile" | "settings";

export default function ScoopsGame() {
  return (
    <RequirePlayer>
      <ShopGate />
    </RequirePlayer>
  );
}

function ShopGate() {
  const nickname = usePlayerStore((s) => s.nickname);
  return (
    <ScoopsProvider key={nickname} nickname={nickname}>
      <Shop />
    </ScoopsProvider>
  );
}

function Shop() {
  const { push } = usePendingRouter();
  const { status, error, session, reload, setTutorialSeen } = useScoops();
  const setNickname = usePlayerStore((s) => s.setNickname);
  const calm = useSettingsStore((s) => s.reducedMotion);
  const [screen, setScreen] = useState<Screen>("home");
  const [draft, setDraft] = useState<ScoopDraft>(emptyDraft);
  const [welcome, setWelcome] = useState(false);
  const [askTour, setAskTour] = useState(false);
  const [tour, setTour] = useState(false);
  const [seenUser, setSeenUser] = useState<string | null>(null);
  const userId = session?.user.id ?? null;
  if (status === "ready" && userId && seenUser !== userId) {
    setSeenUser(userId);
    const saved = loadDraft(userId);
    if (saved && draftHasProgress(saved)) {
      setDraft(saved);
      setWelcome(true);
    } else if (session && !session.tutorialSeen) {
      setAskTour(true);
    }
  }

  const openBuild = (next: ScoopDraft, withTour = false) => {
    setDraft(next);
    setTour(withTour);
    setScreen("build");
  };

  if (status === "loading") {
    return (
      <div className={`scoops-root ${calm ? "is-calm" : ""}`}>
        <ShopBrand />
        <div className="shop-play">
        <div className="awning" />
        <div className="home">
          <Mascot />
          <h1 style={{ fontSize: "2rem" }}>Opening the shop...</h1>
        </div>
        </div>
      </div>
    );
  }

  if (status === "error" || !session) {
    return (
      <div className={`scoops-root ${calm ? "is-calm" : ""}`}>
        <ShopBrand />
        <div className="shop-play">
        <div className="awning" />
        <div className="home">
          <Mascot mood="wow" />
          <h1 style={{ fontSize: "2rem" }}>{error ?? "Shelby dropped that scoop."}</h1>
          <button type="button" className="scoop-btn tone-pink" onClick={() => void reload()}>Try again</button>
          <button type="button" className="scoop-btn tone-cream" onClick={() => push("/adventure")}>Back</button>
        </div>
        </div>
      </div>
    );
  }

  const backHome = () => setScreen("home");

  return (
    <div className={`scoops-root ${calm ? "is-calm" : ""}`}>
      <ShopBrand />
      <div className="shop-play">
      <div className="awning" />
      {screen === "home" ? (
        <ShopBar onBack={() => push("/adventure")} backLabel="Games" />
      ) : (
        <ShopBar
          title={screen === "build" ? "Make a scoop" : screen === "book" ? "My Scoop Book" : screen === "community" ? "Scoop Community" : screen === "badges" ? "Badges" : screen === "profile" ? "My profile" : "Settings"}
          onBack={backHome}
          backLabel="Shop"
        />
      )}
      {screen === "home" && (
        <HomeScreen
          onMake={() => openBuild(draftHasProgress(loadDraft(session.user.id)) ? loadDraft(session.user.id)! : emptyDraft())}
          onBook={() => setScreen("book")}
          onCommunity={() => setScreen("community")}
          onBadges={() => setScreen("badges")}
          onProfile={() => setScreen("profile")}
          onSettings={() => setScreen("settings")}
          onDemo={() => setNickname("Shelby")}
        />
      )}
      {screen === "build" && (
        <Builder
          draft={draft}
          tutorial={tour}
          onExit={backHome}
          onBook={() => setScreen("book")}
          onTutorialDone={() => {
            setTour(false);
            void setTutorialSeen(true);
          }}
        />
      )}
      {screen === "book" && <BookScreen onMake={(next) => openBuild(next)} />}
      {screen === "community" && <CommunityScreen onMake={(next) => openBuild(next)} />}
      {screen === "badges" && <AchievementsScreen />}
      {screen === "profile" && <ProfileScreen />}
      {screen === "settings" && <SettingsScreen onTour={() => openBuild(emptyDraft(), true)} />}
      {welcome && (
        <div className="sheet" role="dialog" aria-labelledby="welcome-back">
          <div className="sheet-card">
            <Mascot mood="love" />
            <h2 id="welcome-back">Welcome back!</h2>
            <p style={{ margin: 0, fontSize: "1.2rem" }}>We saved your ice cream.</p>
            <button type="button" className="scoop-btn tone-pink" onClick={() => { setWelcome(false); openBuild(draft); }}>Continue making it</button>
            <button type="button" className="scoop-btn tone-cream" onClick={() => {
              clearDraft(session.user.id);
              setDraft(emptyDraft());
              setWelcome(false);
              if (!session.tutorialSeen) setAskTour(true);
              else openBuild(emptyDraft());
            }}>Start a new scoop</button>
          </div>
        </div>
      )}
      {askTour && (
        <div className="sheet" role="dialog" aria-labelledby="tour-ask">
          <div className="sheet-card">
            <Mascot />
            <h2 id="tour-ask">Want Shelby to show you how?</h2>
            <button type="button" className="scoop-btn tone-pink" onClick={() => { setAskTour(false); void setTutorialSeen(true); openBuild(emptyDraft(), true); }}>Yes!</button>
            <button type="button" className="scoop-btn tone-cream" onClick={() => { setAskTour(false); void setTutorialSeen(true); }}>I know how!</button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
