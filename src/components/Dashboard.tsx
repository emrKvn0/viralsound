"use client";

import React from "react";
import {
  Search,
  Play,
  Pause,
  Music,
  Heart,
  Plus,
  Trash2,
  Volume2,
  VolumeX,
  ExternalLink,
  Compass,
  FolderHeart,
  User,
  LogOut,
  LogIn,
  Loader2,
  ListPlus,
  X,
  Info,
  Sparkles,
  Disc
} from "lucide-react";
import Button from "./ui/button";
import Input from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import Dialog from "./ui/dialog";

// Yeni importlar
import { TRENDING_HITS } from "@/constants/trendingHits";
import { TikTokIcon, InstagramIcon } from "./icons/BrandIcons";
import DashboardModals from "./dashboard/DashboardModals";
import FloatingPlayer from "./dashboard/FloatingPlayer";
import RouletteTab from "./dashboard/RouletteTab";
import DiscoverTab from "./dashboard/DiscoverTab";
import CollectionsTab from "./dashboard/CollectionsTab";
import FavoritesTab from "./dashboard/FavoritesTab";
import { useDashboard } from "@/hooks/useDashboard";

interface DashboardProps {
  initialSession: any;
}

export default function Dashboard({ initialSession }: DashboardProps) {
  const {
    handleSignOut,
    isLocalMode,
    dbNoticeShown,
    handleCloseDbNotice,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    discoverLanguage,
    setDiscoverLanguage,
    discoverGenre,
    setDiscoverGenre,
    loading,
    recentSearches,
    setRecentSearches,
    tracks,
    searchResults,
    favorites,
    resolvedCache,
    currentTrack,
    isPlaying,
    playTrack,
    handleAutoResolveTikTok,
    resolvingTrackId,
    handleAutoResolveInstagram,
    resolvingInstagramTrackId,
    resolvingStudioTrackId,
    handleToggleFavorite,
    isFavorite,
    session,
    setIsLoginOpen,
    setSelectedTrackToAddToCollection,
    setIsAddToCollectionOpen,
    collections,
    handleDeleteCollection,
    handleAddTrackToCollection,
    handleRemoveTrackFromCollection,
    isLoginOpen,
    loginEmail,
    setLoginEmail,
    loginUsername,
    setLoginUsername,
    handleLoginSubmit,
    isCreateCollectionOpen,
    setIsCreateCollectionOpen,
    newCollName,
    setNewCollName,
    newCollDesc,
    setNewCollDesc,
    handleCreateCollection,
    isAddToCollectionOpen,
    selectedTrackToAddToCollection,
    isTikTokResolverOpen,
    setIsTikTokResolverOpen,
    tiktokInputUrl,
    setTiktokInputUrl,
    setSelectedTrackForTikTok,
    tiktokResolveError,
    setTiktokResolveError,
    resolvingTikTok,
    handleResolveTikTokAudio,
    spinning,
    rouletteTrack,
    rouletteError,
    selectedLanguage,
    setSelectedLanguage,
    selectedGenre,
    setSelectedGenre,
    handleSpinRoulette,
    resolvingRouletteTikTok,
    audioSourceMode,
    currentTime,
    duration,
    volume,
    setVolume,
    isMuted,
    setIsMuted,
    formatTime,
    progressRef,
    handleProgressBarClick,
    playlistCounts
  } = useDashboard(initialSession);

  // Tab Bar Kayan Arka Plan Göstergesi (Sliding Indicator)
  const navRef = React.useRef<HTMLDivElement>(null);
  const discoverTabRef = React.useRef<HTMLButtonElement>(null);
  const collectionsTabRef = React.useRef<HTMLButtonElement>(null);
  const favoritesTabRef = React.useRef<HTMLButtonElement>(null);
  const rouletteTabRef = React.useRef<HTMLButtonElement>(null);

  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({
    left: 0,
    width: 0,
    height: 0,
    opacity: 0
  });

  React.useEffect(() => {
    const updateIndicator = () => {
      let activeEl: HTMLButtonElement | null = null;
      if (activeTab === "discover") activeEl = discoverTabRef.current;
      else if (activeTab === "collections") activeEl = collectionsTabRef.current;
      else if (activeTab === "favorites") activeEl = favoritesTabRef.current;
      else if (activeTab === "roulette") activeEl = rouletteTabRef.current;

      if (activeEl && navRef.current) {
        const navRect = navRef.current.getBoundingClientRect();
        const activeRect = activeEl.getBoundingClientRect();
        
        setIndicatorStyle({
          left: activeRect.left - navRect.left,
          width: activeRect.width,
          height: activeRect.height,
          opacity: 1
        });
      }
    };

    // DOM'un tam render edilmesini garanti edelim
    const timer = setTimeout(updateIndicator, 50);
    window.addEventListener("resize", updateIndicator);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [activeTab, session]);

  return (
    <div className="flex-1 flex flex-col pb-32">
      {/* --- ÜST BAR (NAVBAR) --- */}
      <header className="sticky top-4 z-40 mx-auto w-[96%] max-w-7xl rounded-md border border-white/5 bg-[#07080a]/80 backdrop-blur-xl px-6 py-3 flex items-center justify-between shadow-[0_20px_40px_rgba(0,0,0,0.8)] transition-all duration-300 hover:border-white/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-md bg-gradient-to-tr from-[#c5a880] to-[#8e7556] flex items-center justify-center animate-pulse-glow shadow-[0_0_15px_rgba(197,168,128,0.2)]">
            <Music className="h-5 w-5 text-black" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1.5 font-sans">
              <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 text-transparent bg-clip-text">Hit Music</span>
              <span className="text-[9px] bg-gradient-to-r from-[#c5a880] to-[#e4d5c0] text-transparent bg-clip-text font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/5">PRO</span>
            </h1>
            <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest leading-none mt-0.5">Studio & Social Media Hits</p>
          </div>
        </div>

        {/* Sekme Değiştirici */}
        <nav ref={navRef} className="hidden md:flex items-center gap-1.5 bg-white/3 border border-white/5 p-1 rounded relative overflow-hidden">
          {/* Kayan Aktif Arka Plan Göstergesi */}
          <div 
            className={`absolute rounded transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] pointer-events-none ${
              activeTab === "roulette" 
                ? "bg-gradient-to-r from-[#c5a880] to-[#8e7556] shadow-[0_4px_15px_rgba(197,168,128,0.25)]" 
                : "bg-gradient-to-r from-[#c5a880] to-[#8e7556] shadow-[0_4px_15px_rgba(197,168,128,0.25)]"
            }`}
            style={{
              transform: `translateX(${indicatorStyle.left}px)`,
              width: `${indicatorStyle.width}px`,
              height: `${indicatorStyle.height}px`,
              left: 0,
              top: `${indicatorStyle.top}px`,
              opacity: indicatorStyle.opacity,
            }}
          />

          <button
            ref={discoverTabRef}
            onClick={() => setActiveTab("discover")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "discover"
                ? "text-white font-black scale-[1.02]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Compass className="h-4 w-4" /> Keşfet
          </button>
          <button
            ref={collectionsTabRef}
            onClick={() => {
              if (!session) setIsLoginOpen(true);
              else setActiveTab("collections");
            }}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "collections"
                ? "text-white font-black scale-[1.02]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <ListPlus className="h-4 w-4" /> Koleksiyonlarım
          </button>
          <button
            ref={favoritesTabRef}
            onClick={() => {
              if (!session) setIsLoginOpen(true);
              else setActiveTab("favorites");
            }}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "favorites"
                ? "text-white font-black scale-[1.02]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FolderHeart className="h-4 w-4" /> Favorilerim
          </button>
          <button
            ref={rouletteTabRef}
            onClick={() => setActiveTab("roulette")}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "roulette"
                ? "text-white font-black scale-[1.02]"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Sparkles className="h-4 w-4" /> Viral Rulet
          </button>
        </nav>

        {/* Kullanıcı Giriş Paneli */}
        <div>
          {session && session.user.id !== "guest_user" ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-black text-white">{session.user.name}</span>
                <span className="text-[9px] text-gray-400 font-medium">{session.user.email}</span>
              </div>
              <div className="h-9 w-9 rounded bg-white/5 border border-white/10 flex items-center justify-center text-primary shadow-[inset_0_0_10px_rgba(197,168,128,0.1)]">
                <User className="h-4 w-4" />
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9 text-gray-400 hover:text-red-500 cursor-pointer hover:bg-red-500/10 rounded" title="Çıkış Yap">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {session && session.user.id === "guest_user" && (
                <span className="hidden lg:inline text-[10px] text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded font-black uppercase tracking-wider select-none">
                  Misafir Modu
                </span>
              )}
              <Button
                variant="primary"
                onClick={() => setIsLoginOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded bg-gradient-to-r from-[#c5a880] to-[#8e7556] text-black hover:scale-105 transition-all text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[0_4px_15px_rgba(197,168,128,0.2)]"
              >
                <LogIn className="h-4 w-4" /> Giriş Yap
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Mobilde Alt Sekme Menüsü */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 w-full rounded-t border-t border-white/5 bg-[#0c0d10]/98 backdrop-blur-2xl py-2.5 px-4 pb-safe z-40 flex justify-around items-center shadow-[0_-15px_30px_rgba(0,0,0,0.8)]">
        <button
          onClick={() => setActiveTab("discover")}
          className={`flex items-center justify-center transition-all duration-300 ${
            activeTab === "discover" 
              ? "bg-primary text-black px-3.5 py-2 rounded text-xs font-black gap-1.5 shadow-[0_0_12px_rgba(197,168,128,0.3)] animate-[fade-in_0.2s_ease-out]" 
              : "text-gray-400 p-2.5 hover:text-white"
          }`}
        >
          <Compass className={activeTab === "discover" ? "h-3.5 w-3.5" : "h-5 w-5"} />
          {activeTab === "discover" && <span className="animate-[fade-in_0.2s_ease-out] font-bold">Keşfet</span>}
        </button>

        <button
          onClick={() => {
            if (!session) setIsLoginOpen(true);
            else setActiveTab("collections");
          }}
          className={`flex items-center justify-center transition-all duration-300 ${
            activeTab === "collections" 
              ? "bg-primary text-black px-3.5 py-2 rounded text-xs font-black gap-1.5 shadow-[0_0_12px_rgba(197,168,128,0.3)] animate-[fade-in_0.2s_ease-out]" 
              : "text-gray-400 p-2.5 hover:text-white"
          }`}
        >
          <ListPlus className={activeTab === "collections" ? "h-3.5 w-3.5" : "h-5 w-5"} />
          {activeTab === "collections" && <span className="animate-[fade-in_0.2s_ease-out] font-bold">Koleksiyonlar</span>}
        </button>

        <button
          onClick={() => {
            if (!session) setIsLoginOpen(true);
            else setActiveTab("favorites");
          }}
          className={`flex items-center justify-center transition-all duration-300 ${
            activeTab === "favorites" 
              ? "bg-primary text-black px-3.5 py-2 rounded text-xs font-black gap-1.5 shadow-[0_0_12px_rgba(197,168,128,0.3)] animate-[fade-in_0.2s_ease-out]" 
              : "text-gray-400 p-2.5 hover:text-white"
          }`}
        >
          <FolderHeart className={activeTab === "favorites" ? "h-3.5 w-3.5" : "h-5 w-5"} />
          {activeTab === "favorites" && <span className="animate-[fade-in_0.2s_ease-out] font-bold">Favoriler</span>}
        </button>

        <button
          onClick={() => setActiveTab("roulette")}
          className={`flex items-center justify-center transition-all duration-300 ${
            activeTab === "roulette" 
              ? "bg-gradient-to-r from-[#c5a880] to-[#8e7556] text-black px-3.5 py-2 rounded text-xs font-black gap-1.5 shadow-[0_0_12px_rgba(197,168,128,0.3)] animate-[fade-in_0.2s_ease-out]" 
              : "text-gray-400 p-2.5 hover:text-white"
          }`}
        >
          <Sparkles className={activeTab === "roulette" ? "h-3.5 w-3.5" : "h-5 w-5"} />
          {activeTab === "roulette" && <span className="animate-[fade-in_0.2s_ease-out] font-bold">Rulet</span>}
        </button>
      </div>

      {/* --- ANA BÖLÜM --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Neon Bilgi Bannerı (Yerel Mod Fallback Bildirimi) */}
        {isLocalMode && dbNoticeShown && (
          <div className="relative glass-panel rounded p-4 bg-primary/10 border-primary/20 text-gray-200 text-sm flex items-center justify-between animate-float">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Info className="h-5 w-5" />
              </div>
              <p className="leading-relaxed pr-6">
                <strong className="text-primary">💡 Yerel Çalışma Modu Aktif:</strong> Neon veritabanı bağlantısı kurulmadığı için eklediğiniz şarkılar ve oluşturduğunuz koleksiyonlar yerel tarayıcı belleğine (LocalStorage) kaydediliyor!
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseDbNotice}
              className="h-8 w-8 text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* --- 1. KEŞFET (DISCOVER) SEKME İÇERİĞİ --- */}
        {activeTab === "discover" && (
          <DiscoverTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            discoverLanguage={discoverLanguage}
            setDiscoverLanguage={setDiscoverLanguage}
            discoverGenre={discoverGenre}
            setDiscoverGenre={setDiscoverGenre}
            loading={loading}
            recentSearches={recentSearches}
            setRecentSearches={setRecentSearches}
            tracks={tracks}
            searchResults={searchResults}
            favorites={favorites}
            resolvedCache={resolvedCache}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            playTrack={playTrack}
            handleAutoResolveTikTok={handleAutoResolveTikTok}
            resolvingTrackId={resolvingTrackId}
            handleAutoResolveInstagram={handleAutoResolveInstagram}
            resolvingInstagramTrackId={resolvingInstagramTrackId}
            resolvingStudioTrackId={resolvingStudioTrackId}
            handleToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            session={session}
            setIsLoginOpen={setIsLoginOpen}
            setSelectedTrackToAddToCollection={setSelectedTrackToAddToCollection}
            setIsAddToCollectionOpen={setIsAddToCollectionOpen}
            playlistCounts={playlistCounts}
          />
        )}

        {/* --- 2. KOLEKSİYONLARIM (COLLECTIONS) SEKME İÇERİĞİ --- */}
        {activeTab === "collections" && (
          <CollectionsTab
            setIsCreateCollectionOpen={setIsCreateCollectionOpen}
            collections={collections}
            handleDeleteCollection={handleDeleteCollection}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            resolvedCache={resolvedCache}
            playTrack={playTrack}
            handleAutoResolveTikTok={handleAutoResolveTikTok}
            resolvingTrackId={resolvingTrackId}
            handleAutoResolveInstagram={handleAutoResolveInstagram}
            resolvingInstagramTrackId={resolvingInstagramTrackId}
            handleToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            handleRemoveTrackFromCollection={handleRemoveTrackFromCollection}
          />
        )}

        {/* --- 3. FAVORİLERİM (FAVORITES) SEKME İÇERİĞİ --- */}
        {activeTab === "favorites" && (
          <FavoritesTab
            favorites={favorites}
            resolvedCache={resolvedCache}
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            playTrack={playTrack}
            handleAutoResolveTikTok={handleAutoResolveTikTok}
            resolvingTrackId={resolvingTrackId}
            handleAutoResolveInstagram={handleAutoResolveInstagram}
            resolvingInstagramTrackId={resolvingInstagramTrackId}
            handleToggleFavorite={handleToggleFavorite}
            setActiveTab={setActiveTab}
          />
        )}

        {/* --- 4. VİRAL RULET (VIRAL ROULETTE) SEKME İÇERİĞİ --- */}
        {activeTab === "roulette" && (
          <RouletteTab
            spinning={spinning}
            rouletteTrack={rouletteTrack}
            rouletteError={rouletteError}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            selectedGenre={selectedGenre}
            setSelectedGenre={setSelectedGenre}
            handleSpinRoulette={handleSpinRoulette}
            playTrack={playTrack}
            isPlaying={isPlaying}
            currentTrack={currentTrack}
            resolvingRouletteTikTok={resolvingRouletteTikTok}
            handleToggleFavorite={handleToggleFavorite}
            isFavorite={isFavorite}
            session={session}
            setIsLoginOpen={setIsLoginOpen}
            setSelectedTrackToAddToCollection={setSelectedTrackToAddToCollection}
            setIsAddToCollectionOpen={setIsAddToCollectionOpen}
          />
        )}
      </main>

          {/* --- YÜZEN PREMIUM SES OYNATICI (FLOATING PREMIUM AUDIO PLAYER) --- */}
      {currentTrack && (
        <FloatingPlayer
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          audioSourceMode={audioSourceMode}
          activeTab={activeTab}
          playTrack={playTrack}
          handleAutoResolveTikTok={handleAutoResolveTikTok}
          handleAutoResolveInstagram={handleAutoResolveInstagram}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          setVolume={setVolume}
          isMuted={isMuted}
          setIsMuted={setIsMuted}
          formatTime={formatTime}
          progressRef={progressRef}
          handleProgressBarClick={handleProgressBarClick}
          resolvingStudioTrackId={resolvingStudioTrackId}
        />
      )}

      {/* --- MODALS / DIALOGS --- */}
      <DashboardModals
        isLoginOpen={isLoginOpen}
        setIsLoginOpen={setIsLoginOpen}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginUsername={loginUsername}
        setLoginUsername={setLoginUsername}
        handleLoginSubmit={handleLoginSubmit}
        isCreateCollectionOpen={isCreateCollectionOpen}
        setIsCreateCollectionOpen={setIsCreateCollectionOpen}
        newCollName={newCollName}
        setNewCollName={setNewCollName}
        newCollDesc={newCollDesc}
        setNewCollDesc={setNewCollDesc}
        handleCreateCollection={handleCreateCollection}
        isAddToCollectionOpen={isAddToCollectionOpen}
        setIsAddToCollectionOpen={setIsAddToCollectionOpen}
        selectedTrackToAddToCollection={selectedTrackToAddToCollection}
        setSelectedTrackToAddToCollection={setSelectedTrackToAddToCollection}
        collections={collections}
        handleAddTrackToCollection={handleAddTrackToCollection}
        isTikTokResolverOpen={isTikTokResolverOpen}
        setIsTikTokResolverOpen={setIsTikTokResolverOpen}
        tiktokInputUrl={tiktokInputUrl}
        setTiktokInputUrl={setTiktokInputUrl}
        setSelectedTrackForTikTok={setSelectedTrackForTikTok}
        tiktokResolveError={tiktokResolveError}
        setTiktokResolveError={setTiktokResolveError}
        resolvingTikTok={resolvingTikTok}
        handleResolveTikTokAudio={handleResolveTikTokAudio}
      />
      
</div>
  );
}

