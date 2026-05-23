import React, { useState, useMemo } from "react";
import { 
  Loader2, 
  Search, 
  X, 
  Music, 
  Pause, 
  Play, 
  Plus, 
  Heart, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  Sparkles, 
  TrendingUp, 
  Activity,
  Compass
} from "lucide-react";
import Button from "../ui/button";
import Input from "../ui/input";
import { Card } from "../ui/card";
import { SpotifyTrack } from "@/app/actions/spotify";
import { DBFavorite } from "@/app/actions/database";
import { TikTokIcon, InstagramIcon } from "../icons/BrandIcons";
import { TRENDING_HITS } from "@/constants/trendingHits";

interface DiscoverTabProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  discoverLanguage: "all" | "tr" | "global";
  setDiscoverLanguage: (lang: "all" | "tr" | "global") => void;
  discoverGenre: "all" | "pop" | "rap" | "rock" | "dance" | "r&b";
  setDiscoverGenre: (genre: "all" | "pop" | "rap" | "rock" | "dance" | "r&b") => void;
  loading: boolean;
  recentSearches: string[];
  setRecentSearches: React.Dispatch<React.SetStateAction<string[]>>;
  tracks: SpotifyTrack[];
  favorites: DBFavorite[];
  resolvedCache: Record<string, any>;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  playTrack: (track: any) => void;
  handleAutoResolveTikTok: (track: any) => void;
  resolvingTrackId: string | null;
  handleAutoResolveInstagram: (track: any) => void;
  resolvingInstagramTrackId: string | null;
  handleToggleFavorite: (track: any) => void;
  isFavorite: (trackId: string) => boolean;
  session: any;
  setIsLoginOpen: (open: boolean) => void;
  setSelectedTrackToAddToCollection: (track: any) => void;
  setIsAddToCollectionOpen: (open: boolean) => void;
}

export default function DiscoverTab({
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
  favorites,
  resolvedCache,
  currentTrack,
  isPlaying,
  playTrack,
  handleAutoResolveTikTok,
  resolvingTrackId,
  handleAutoResolveInstagram,
  resolvingInstagramTrackId,
  handleToggleFavorite,
  isFavorite,
  session,
  setIsLoginOpen,
  setSelectedTrackToAddToCollection,
  setIsAddToCollectionOpen
}: DiscoverTabProps) {
  // Yerel Yönetim State'leri
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"popular" | "az" | "artist">("popular");

  // Trend Hits listesinden şarkıya ait dil/tür etiketini bulma
  const getTrackBadge = (title: string, artist: string) => {
    const titleLower = title.toLowerCase();
    const artistLower = artist.toLowerCase();
    const match = TRENDING_HITS.find(
      h => titleLower.includes(h.title.toLowerCase()) || 
           h.title.toLowerCase().includes(titleLower) ||
           artistLower.includes(h.artist.toLowerCase())
    );
    if (match) {
      return {
        lang: match.language === "tr" ? "TR" : "GLB",
        genre: match.genre.toUpperCase()
      };
    }
    return null;
  };

  // Dinamik Sıralama Mantığı
  const sortedTracks = useMemo(() => {
    let result = [...tracks];
    if (sortBy === "az") {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "artist") {
      result.sort((a, b) => a.artist.localeCompare(b.artist));
    }
    return result;
  }, [tracks, sortBy]);

  // Canlı İstatistik Hesaplamaları
  const stats = useMemo(() => {
    const total = tracks.length;
    const favorited = tracks.filter(t => isFavorite(t.id)).length;
    const resolvedTikTok = tracks.filter(t => {
      const fav = favorites.find(f => f.spotifyId === t.id);
      return !!fav?.customPreviewUrl || !!resolvedCache[t.id]?.customPreviewUrl;
    }).length;

    return {
      total,
      favorited,
      resolvedTikTok,
      popularityScore: total > 0 ? Math.min(100, Math.round((resolvedTikTok / total) * 40 + 60)) : 0
    };
  }, [tracks, favorites, resolvedCache]);

  return (
    <div className="flex flex-col gap-6">
      {/* Kahraman Alanı (Hero Section) */}
      <div className="relative glass-panel rounded-3xl p-8 lg:p-12 overflow-hidden border border-white/10 flex flex-col items-center text-center lg:text-left lg:items-start lg:justify-between gap-6">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/20 via-cyan-glow/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-spotify/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl relative z-10 flex flex-col gap-3">
          <span className="self-center lg:self-start text-xs font-extrabold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20 animate-[fadeIn_0.4s_ease-out] flex items-center gap-1.5 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> En Viral Şarkı Kesitleri
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Tiktok Trendlerini <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-primary via-cyan-glow to-spotify text-transparent bg-clip-text">Spotify Kalitesiyle</span> Dinleyin
          </h2>
          <p className="text-sm lg:text-base text-gray-400 leading-relaxed mt-2">
            TikTok üzerinde viral olan en can alıcı şarkı nakaratlarını Spotify yüksek ses kalitesiyle anında dinleyin, kaydedin ve orijinal TikTok/Instagram ses sayfalarına tek tıkla ulaşın.
          </p>
        </div>

        {/* Canlı Arama Kutusu */}
        <div className="w-full max-w-xl relative z-10 flex flex-col gap-2.5">
          <Input
            type="text"
            placeholder="Sanatçı, şarkı adı veya müzik türü arayın..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={loading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Search className="h-5 w-5" />}
          />

          {/* Son Aramalar */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-1 px-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider select-none">Son Aramalar:</span>
              {recentSearches.map((q, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-primary/40 rounded-full px-3 py-1 transition-all">
                  <button
                    onClick={() => setSearchQuery(q)}
                    className="text-[10px] text-gray-300 hover:text-white font-bold cursor-pointer"
                  >
                    {q}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRecentSearches(prev => {
                        const updated = prev.filter(item => item !== q);
                        localStorage.setItem("vsh_recent_searches", JSON.stringify(updated));
                        return updated;
                      });
                    }}
                    className="text-gray-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dinamik Trend Filtreleme Seçenekleri Paneli */}
      {searchQuery.trim() === "" && (
        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md shadow-[0_10px_30px_rgba(0,0,0,0.4)] animate-[fadeIn_0.5s_ease-out] flex flex-col lg:flex-row items-center gap-4">
          {/* Dil Seçimi */}
          <div className="flex-1 flex flex-col gap-1.5 w-full">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center lg:text-left select-none">Dil Seçimi</span>
            <div className="grid grid-cols-3 gap-1 bg-white/3 border border-white/5 p-0.5 rounded-xl">
              <button
                onClick={() => setDiscoverLanguage("all")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                  discoverLanguage === "all"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white font-black shadow-[0_2px_8px_rgba(168,85,247,0.2)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Hepsi
              </button>
              <button
                onClick={() => setDiscoverLanguage("tr")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                  discoverLanguage === "tr"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white font-black shadow-[0_2px_8px_rgba(168,85,247,0.2)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Türkçe
              </button>
              <button
                onClick={() => setDiscoverLanguage("global")}
                className={`py-1.5 rounded-lg text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                  discoverLanguage === "global"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white font-black shadow-[0_2px_8px_rgba(168,85,247,0.2)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Yabancı
              </button>
            </div>
          </div>

          {/* Müzik Türü Filtresi */}
          <div className="flex-1 flex flex-col gap-1.5 w-full min-w-0">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center lg:text-left select-none">Müzik Türü</span>
            <div className="grid grid-cols-6 gap-1 bg-white/3 border border-white/5 p-0.5 rounded-xl">
              {(["all", "pop", "rap", "rock", "dance", "r&b"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setDiscoverGenre(g)}
                  className={`py-1.5 rounded-lg text-[9px] font-black transition-all duration-300 cursor-pointer uppercase ${
                    discoverGenre === g
                      ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-[0_2px_8px_rgba(168,85,247,0.2)]"
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {g === "all" ? "HPS" : g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dinamik Trend İstatistik Paneli */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/2 border border-white/5 rounded-2xl p-4 backdrop-blur-sm animate-[fadeIn_0.6s_ease-out]">
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5">
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Compass className="h-3 w-3 text-primary" /> Toplam Şarkı</span>
          <h4 className="text-xl font-black text-white">{stats.total} <span className="text-xs text-gray-400 font-bold">Adet</span></h4>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5">
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><TrendingUp className="h-3 w-3 text-[#ff0050]" /> Trend Skoru</span>
          <h4 className="text-xl font-black text-cyan-glow">%{stats.popularityScore} <span className="text-xs text-gray-400 font-bold">Popüler</span></h4>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5">
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><TikTokIcon className="h-3 w-3 text-white" /> Çözülen TikTok</span>
          <h4 className="text-xl font-black text-white">{stats.resolvedTikTok} <span className="text-xs text-gray-400 font-bold">Viral Ses</span></h4>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/3 border border-white/5">
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Activity className="h-3 w-3 text-spotify" /> Müzik Kalitesi</span>
          <h4 className="text-xl font-black text-spotify">320kbps <span className="text-xs text-gray-400 font-bold">Premium</span></h4>
        </div>
      </div>

      {/* Arama Sonuçları Kontrol Barı (Görünüm Modu ve Sıralama Butonları) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-2 px-1">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-black text-white tracking-wide font-sans flex items-center gap-2">
            {searchQuery 
              ? `"${searchQuery}" İçin Arama Sonuçları` 
              : `Günün Trend ${discoverLanguage === "tr" ? "Türkçe" : discoverLanguage === "global" ? "Yabancı" : ""} ${discoverGenre !== "all" ? discoverGenre.toUpperCase() : ""} Şarkıları`}
          </h3>
          <span className="text-xs text-gray-400 font-semibold">{tracks.length} Sonuç Listelendi</span>
        </div>

        {/* Görünüm ve Sıralama Kontrolleri */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          {/* Sıralama Düğmesi */}
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl p-1">
            <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest pl-2 select-none flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" /> Sırala:
            </span>
            <button
              onClick={() => setSortBy("popular")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase ${
                sortBy === "popular"
                  ? "bg-white/10 text-white font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Trend
            </button>
            <button
              onClick={() => setSortBy("az")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase ${
                sortBy === "az"
                  ? "bg-white/10 text-white font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              A-Z
            </button>
            <button
              onClick={() => setSortBy("artist")}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all cursor-pointer uppercase ${
                sortBy === "artist"
                  ? "bg-white/10 text-white font-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sanatçı
            </button>
          </div>

          {/* Görünüm Geçişi (Grid / List) */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "grid" ? "bg-white/10 text-primary" : "text-gray-400 hover:text-white"
              }`}
              title="Kutucuk Görünümü"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list" ? "bg-white/10 text-primary" : "text-gray-400 hover:text-white"
              }`}
              title="Liste Görünümü"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Şarkı Listeleme Alanı */}
      <div className="w-full">
        {loading && tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm font-bold">Müzikler yükleniyor...</p>
          </div>
        ) : tracks.length === 0 ? (
          <div className="glass-panel rounded-2xl py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <Music className="h-12 w-12 text-gray-500" />
            <p className="text-sm font-semibold">Aradığınız kriterde şarkı bulunamadı.</p>
            <p className="text-xs text-gray-500">Lütfen farklı bir şarkı, sanatçı aramayı veya filtrelerinizi değiştirmeyi deneyin.</p>
          </div>
        ) : viewMode === "grid" ? (
          /* ========================================================================= */
          /* 1. GRID GÖRÜNÜMÜ                                                          */
          /* ========================================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-[fadeIn_0.5s_ease-out]">
            {sortedTracks.map((track) => {
              const favRecord = favorites.find(f => f.spotifyId === track.id);
              const hasCustomTikTok = !!favRecord?.customPreviewUrl || !!resolvedCache[track.id]?.customPreviewUrl;
              const hasCustomInstagram = !!favRecord?.instagramAudioUrl || !!resolvedCache[track.id]?.instagramAudioUrl;
              
              const playbackTrack = { 
                ...track, 
                customPreviewUrl: favRecord?.customPreviewUrl || resolvedCache[track.id]?.customPreviewUrl || undefined, 
                tiktokVideoUrl: favRecord?.tiktokVideoUrl || resolvedCache[track.id]?.tiktokVideoUrl || undefined,
                instagramAudioUrl: favRecord?.instagramAudioUrl || resolvedCache[track.id]?.instagramAudioUrl || undefined,
                instagramVideoUrl: favRecord?.instagramVideoUrl || resolvedCache[track.id]?.instagramVideoUrl || undefined
              };

              const active = currentTrack?.id === track.id;
              const playing = active && isPlaying;
              const badge = getTrackBadge(track.title, track.artist);

              return (
                <Card 
                  key={track.id} 
                  className={`relative overflow-hidden group border transition-all duration-300 ${
                    active 
                      ? "bg-white/10 border-primary/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]" 
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8 hover:shadow-[0_10px_25px_rgba(0,0,0,0.3)]"
                  }`}
                >
                  <div className="flex items-center gap-4 relative z-10">
                    {/* Albüm Resmi ve Play Buton Hover */}
                    <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300 shadow-lg border border-white/5 bg-black/20">
                      <img
                        src={track.albumArt}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                        <button
                          onClick={() => playTrack(playbackTrack)}
                          className="h-9 w-9 bg-primary text-white rounded-full flex items-center justify-center active:scale-90 transition-transform cursor-pointer shadow-[0_4px_12px_rgba(168,85,247,0.4)]"
                        >
                          {playing ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white translate-x-[1px]" />}
                        </button>
                      </div>
                      {/* Oynatılıyor Dalga Animasyonu */}
                      {playing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-[3px]">
                          <span className="w-[3px] bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s" }} />
                          <span className="w-[3px] bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.3s" }} />
                          <span className="w-[3px] bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.5s" }} />
                        </div>
                      )}
                    </div>

                    {/* Şarkı Bilgileri */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                        {badge && (
                          <>
                            <span className="px-1.5 py-0.5 text-[7px] font-black rounded-md bg-white/10 text-white border border-white/10">
                              {badge.lang}
                            </span>
                            <span className="px-1.5 py-0.5 text-[7px] font-black rounded-md bg-primary/20 text-primary border border-primary/20">
                              {badge.genre}
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="font-extrabold text-white text-sm truncate group-hover:text-primary transition-colors font-sans leading-tight">
                        {track.title}
                      </h4>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{track.artist}</p>
                    </div>

                    {/* Aksiyon Butonları */}
                    <div className="flex items-center gap-1.5">
                      {/* TikTok Sesi Çöz Butonu */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleAutoResolveTikTok({
                            id: track.id,
                            title: track.title,
                            artist: track.artist,
                            type: "discover",
                            albumArt: track.albumArt,
                            previewUrl: track.previewUrl
                          });
                        }}
                        disabled={resolvingTrackId === track.id}
                        className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border cursor-pointer ${
                          resolvingTrackId === track.id
                            ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                            : hasCustomTikTok 
                              ? "bg-[#ff0050]/15 border-[#ff0050]/40 text-[#ff0050] shadow-[0_0_12px_rgba(255,0,80,0.25)] animate-pulse-glow hover:border-[#00f2fe]" 
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#ff0050]/50 hover:bg-[#ff0050]/10"
                        }`}
                        title={hasCustomTikTok ? "TikTok Sesi Aktif! Yenilemek için tıklayın." : "TikTok Viral Sesi Otomatik Entegre Et"}
                      >
                        {resolvingTrackId === track.id ? (
                          <Loader2 className="h-4 w-4 text-[#ff0050] animate-spin" />
                        ) : (
                          <>
                            {hasCustomTikTok && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00f2fe]"></span>
                              </span>
                            )}
                            <TikTokIcon className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      {/* Instagram Sesi Çöz Butonu */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          handleAutoResolveInstagram({
                            id: track.id,
                            title: track.title,
                            artist: track.artist,
                            type: "discover",
                            albumArt: track.albumArt,
                            previewUrl: track.previewUrl
                          });
                        }}
                        disabled={resolvingInstagramTrackId === track.id}
                        className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border cursor-pointer ${
                          resolvingInstagramTrackId === track.id
                            ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                            : hasCustomInstagram 
                              ? "bg-gradient-to-tr from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/10 border-[#833ab4]/40 text-[#fd1d1d] shadow-[0_0_12px_rgba(131,58,180,0.25)] animate-pulse-glow hover:border-[#fcb045]" 
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#833ab4]/50 hover:bg-[#833ab4]/10"
                        }`}
                        title={hasCustomInstagram ? "Instagram Reels Sesi Aktif! Yenilemek için tıklayın." : "Instagram Reels Sesi Otomatik Entegre Et"}
                      >
                        {resolvingInstagramTrackId === track.id ? (
                          <Loader2 className="h-4 w-4 text-[#fd1d1d] animate-spin" />
                        ) : (
                          <>
                            {hasCustomInstagram && (
                              <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcb045] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#fcb045]"></span>
                              </span>
                            )}
                            <InstagramIcon className="h-4 w-4" />
                          </>
                        )}
                      </Button>

                      {/* Favori */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFavorite(playbackTrack)}
                        className={`h-8 w-8 hover:bg-white/5 cursor-pointer rounded-xl transition-colors ${
                          isFavorite(track.id) ? "text-red-500" : "text-gray-400 hover:text-white"
                        }`}
                      >
                        <Heart className="h-4 w-4" fill={isFavorite(track.id) ? "currentColor" : "none"} />
                      </Button>

                      {/* Koleksiyona Ekle */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (!session) {
                            setIsLoginOpen(true);
                            return;
                          }
                          setSelectedTrackToAddToCollection(playbackTrack);
                          setIsAddToCollectionOpen(true);
                        }}
                        className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. COMPACT LİSTE GÖRÜNÜMÜ                                                 */
          /* ========================================================================= */
          <div className="flex flex-col gap-2 animate-[fadeIn_0.5s_ease-out]">
            {sortedTracks.map((track, idx) => {
              const favRecord = favorites.find(f => f.spotifyId === track.id);
              const hasCustomTikTok = !!favRecord?.customPreviewUrl || !!resolvedCache[track.id]?.customPreviewUrl;
              const hasCustomInstagram = !!favRecord?.instagramAudioUrl || !!resolvedCache[track.id]?.instagramAudioUrl;
              
              const playbackTrack = { 
                ...track, 
                customPreviewUrl: favRecord?.customPreviewUrl || resolvedCache[track.id]?.customPreviewUrl || undefined, 
                tiktokVideoUrl: favRecord?.tiktokVideoUrl || resolvedCache[track.id]?.tiktokVideoUrl || undefined,
                instagramAudioUrl: favRecord?.instagramAudioUrl || resolvedCache[track.id]?.instagramAudioUrl || undefined,
                instagramVideoUrl: favRecord?.instagramVideoUrl || resolvedCache[track.id]?.instagramVideoUrl || undefined
              };

              const active = currentTrack?.id === track.id;
              const playing = active && isPlaying;
              const badge = getTrackBadge(track.title, track.artist);

              return (
                <div 
                  key={track.id} 
                  className={`flex items-center justify-between gap-4 p-2.5 rounded-2xl border transition-all duration-300 relative group ${
                    active 
                      ? "bg-white/10 border-primary/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]" 
                      : "bg-white/3 border-white/5 hover:border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Sıra Numarası veya Play Buton */}
                    <div className="relative h-11 w-11 rounded-lg overflow-hidden shrink-0 shadow border border-white/5 bg-black/20 flex items-center justify-center">
                      <img
                        src={track.albumArt}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <button
                          onClick={() => playTrack(playbackTrack)}
                          className="h-7 w-7 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow"
                        >
                          {playing ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white translate-x-[0.5px]" />}
                        </button>
                      </div>
                      {playing && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-[2.5px]">
                          <span className="w-[2.5px] h-4 bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s" }} />
                          <span className="w-[2.5px] h-4 bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.3s" }} />
                          <span className="w-[2.5px] h-4 bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.5s" }} />
                        </div>
                      )}
                    </div>

                    <span className="text-[10px] text-gray-500 font-extrabold w-4 text-center select-none group-hover:hidden">
                      {idx + 1}
                    </span>

                    {/* Metadata Bilgileri */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-white text-xs truncate leading-tight group-hover:text-primary transition-colors font-sans">
                          {track.title}
                        </h4>
                        {badge && (
                          <span className="px-1.5 py-0.2 text-[6.5px] font-black rounded bg-white/5 border border-white/10 text-gray-400 shrink-0">
                            {badge.lang}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{track.artist}</p>
                    </div>
                  </div>

                  {/* Sağ Taraf - Aksiyon Butonları (Kompakt) */}
                  <div className="flex items-center gap-2">
                    {/* TikTok Butonu */}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleAutoResolveTikTok({
                          id: track.id,
                          title: track.title,
                          artist: track.artist,
                          type: "discover",
                          albumArt: track.albumArt,
                          previewUrl: track.previewUrl
                        });
                      }}
                      disabled={resolvingTrackId === track.id}
                      className={`h-8 px-2 rounded-xl transition-all border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                        resolvingTrackId === track.id
                          ? "bg-white/5 border-white/10 text-gray-500"
                          : hasCustomTikTok 
                            ? "bg-[#ff0050]/15 border-[#ff0050]/30 text-[#ff0050]" 
                            : "bg-white/3 border-white/5 text-gray-400 hover:text-white hover:border-[#ff0050]/30"
                      }`}
                    >
                      {resolvingTrackId === track.id ? (
                        <Loader2 className="h-3 w-3 text-[#ff0050] animate-spin" />
                      ) : (
                        <TikTokIcon className="h-3 w-3" />
                      )}
                      <span className="hidden sm:inline">TikTok</span>
                    </Button>

                    {/* Instagram Butonu */}
                    <Button
                      variant="ghost"
                      onClick={() => {
                        handleAutoResolveInstagram({
                          id: track.id,
                          title: track.title,
                          artist: track.artist,
                          type: "discover",
                          albumArt: track.albumArt,
                          previewUrl: track.previewUrl
                        });
                      }}
                      disabled={resolvingInstagramTrackId === track.id}
                      className={`h-8 px-2 rounded-xl transition-all border text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer ${
                        resolvingInstagramTrackId === track.id
                          ? "bg-white/5 border-white/10 text-gray-500"
                          : hasCustomInstagram 
                            ? "bg-[#833ab4]/15 border-[#833ab4]/30 text-[#fd1d1d]" 
                            : "bg-white/3 border-white/5 text-gray-400 hover:text-white hover:border-[#833ab4]/30"
                      }`}
                    >
                      {resolvingInstagramTrackId === track.id ? (
                        <Loader2 className="h-3 w-3 text-[#fd1d1d] animate-spin" />
                      ) : (
                        <InstagramIcon className="h-3 w-3" />
                      )}
                      <span className="hidden sm:inline">Reels</span>
                    </Button>

                    {/* Favori */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleFavorite(playbackTrack)}
                      className={`h-7 w-7 hover:bg-white/5 cursor-pointer rounded-lg transition-colors ${
                        isFavorite(track.id) ? "text-red-500" : "text-gray-400 hover:text-white"
                      }`}
                    >
                      <Heart className="h-3.5 w-3.5" fill={isFavorite(track.id) ? "currentColor" : "none"} />
                    </Button>

                    {/* Koleksiyona Ekle */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (!session) {
                          setIsLoginOpen(true);
                          return;
                        }
                        setSelectedTrackToAddToCollection(playbackTrack);
                        setIsAddToCollectionOpen(true);
                      }}
                      className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
