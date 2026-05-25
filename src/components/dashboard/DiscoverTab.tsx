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
  searchResults: SpotifyTrack[];
  favorites: DBFavorite[];
  resolvedCache: Record<string, any>;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  playTrack: (track: any) => void;
  handleAutoResolveTikTok: (track: any) => void;
  resolvingTrackId: string | null;
  handleAutoResolveInstagram: (track: any) => void;
  resolvingInstagramTrackId: string | null;
  resolvingStudioTrackId?: string | null;
  handleToggleFavorite: (track: any) => void;
  isFavorite: (trackId: string) => boolean;
  session: any;
  setIsLoginOpen: (open: boolean) => void;
  setSelectedTrackToAddToCollection: (track: any) => void;
  setIsAddToCollectionOpen: (open: boolean) => void;
  playlistCounts?: Record<string, number>;
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
  playlistCounts = {}
}: DiscoverTabProps) {
  // Yerel Yönetim State'leri
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"popular" | "az" | "artist">("popular");

  // Arama için yerel input ve dropdown durumu
  const [inputValue, setInputValue] = useState(searchQuery);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  // Ref tanımlamaları
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Arama inputu değiştikçe 120ms debounce ile aramayı otomatik tetikle (Gerçek zamanlı öneri)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(inputValue);
      if (inputValue.trim()) {
        setIsDropdownOpen(true);
      } else {
        setIsDropdownOpen(false);
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [inputValue, setSearchQuery]);

  // Click outside logic - Dışarı tıklandığında dropdown kapansın
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // FocusedIndex resetleme
  React.useEffect(() => {
    setFocusedIndex(-1);
  }, [searchResults, isDropdownOpen]);

  // Klavyeyle seçilen elemanı otomatik görüş alanına kaydırma (Auto-scroll)
  React.useEffect(() => {
    if (focusedIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.querySelector(`[data-index="${focusedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({
          block: "nearest",
          behavior: "smooth"
        });
      }
    }
  }, [focusedIndex]);

  const handleSearchSubmit = () => {
    setSearchQuery(inputValue);
    if (inputValue.trim()) {
      setIsDropdownOpen(true);
    }
  };

  const handleClearSearch = () => {
    setInputValue("");
    setSearchQuery("");
    setIsDropdownOpen(false);
  };

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
    <div className="flex flex-col lg:flex-row gap-8 items-start w-full">
      {/* SOL SİDEBAR: Canlı Çalma Listeleri */}
      {searchQuery.trim() === "" && (
        <aside className="w-full lg:w-1/4 flex flex-col gap-4 sticky lg:top-28 shrink-0">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2 select-none font-sans">
              <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Çalma Listeleri
            </h3>
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider select-none">Canlı</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {[
              {
                id: "tiktok-viral",
                title: "TikTok 2026 Viral Hits",
                description: "TikTok'ta fırtına estiren popüler trend nakaratlar",
                gradient: "from-[#ff0050]/20 to-[#c5a880]/15",
                lang: "all" as const,
                genre: "all" as const,
                badge: "🔥 VİRAL"
              },
              {
                id: "tr-trends",
                title: "Türkçe Viral Trendler",
                description: "Türkiye trendlerindeki en gözde yerli hit kesitleri",
                gradient: "from-[#c5a880]/20 to-[#8e7556]/15",
                lang: "tr" as const,
                genre: "all" as const,
                badge: "🇹🇷 YERLİ"
              },
              {
                id: "global-charts",
                title: "Global Chartbusters",
                description: "Dünya listelerini kasıp kavuran popüler yabancı müzikler",
                gradient: "from-[#8e7556]/20 to-[#07080a]/15",
                lang: "global" as const,
                genre: "all" as const,
                badge: "🌍 GLOBAL"
              },
              {
                id: "rap-hiphop",
                title: "Hip-Hop & Rap Nation",
                description: "Lvbel C5, Travis Scott, Blok3 ve nicesiyle sert ritimler",
                gradient: "from-[#110c1c]/40 to-[#c5a880]/10",
                lang: "all" as const,
                genre: "rap" as const,
                badge: "🎤 RAP"
              },
              {
                id: "rock-classics",
                title: "Alternative & Rock Classics",
                description: "Tom Odell, maNga, Madrigal ve fazlasıyla melankolik esintiler",
                gradient: "from-[#c5a880]/15 to-[#8e7556]/5",
                lang: "all" as const,
                genre: "rock" as const,
                badge: "🎸 ROCK"
              }
            ].map((pl) => {
              const isActive = discoverLanguage === pl.lang && discoverGenre === pl.genre;
              const count = playlistCounts[pl.id] || 0;
              return (
                <div
                  key={pl.id}
                  onClick={() => {
                    setDiscoverLanguage(pl.lang);
                    setDiscoverGenre(pl.genre);
                  }}
                  className={`relative p-4 rounded border-t border-r border-b border-l-2 transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden group select-none ${
                    isActive
                      ? "bg-[#12141a] border-t-white/10 border-r-white/10 border-b-white/10 border-l-[#c5a880] shadow-[0_8px_25px_rgba(0,0,0,0.5)] scale-[1.01]"
                      : "bg-[#090a0d] border-t-white/5 border-r-white/5 border-b-white/5 border-l-transparent hover:border-l-white/20 hover:bg-[#0e1015]"
                  }`}
                >
                  <div className="relative z-10 flex flex-col gap-1.5">
                    <span className="self-start text-[8px] font-black uppercase px-2 py-0.5 rounded bg-white/5 border border-white/10 tracking-widest text-[#c5a880]">
                      {pl.badge}
                    </span>
                    <h4 className="font-extrabold text-white text-sm group-hover:text-primary transition-colors leading-snug font-sans">
                      {pl.title}
                    </h4>
                    <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                      {pl.description}
                    </p>
                  </div>

                  <div className="relative z-10 mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-gray-500 group-hover:text-gray-300 transition-colors uppercase font-mono tracking-wider">
                      {loading && isActive ? "YÜKLENİYOR..." : `${count} ADET HİT`}
                    </span>
                    <div className={`h-6 w-6 rounded bg-white/5 border border-white/10 flex items-center justify-center transition-all duration-300 group-hover:bg-primary group-hover:text-black group-hover:border-primary ${
                      isActive ? "bg-primary text-black border-primary" : "text-gray-400"
                    }`}>
                      <Play className="h-2.5 w-2.5 fill-current" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      )}

      {/* SAĞ TARAF: Ana Keşfet Akışı */}
      <div className={`flex-1 flex flex-col gap-6 ${searchQuery.trim() === "" ? "lg:w-3/4" : "w-full"}`}>
        {/* Kahraman Alanı (Hero Section) */}
        <div className="relative glass-panel rounded p-8 lg:p-12 border border-white/5 flex flex-col items-center text-center lg:text-left lg:items-start lg:justify-between gap-6">
        {/* Glow'ların dışarı taşmasını önlemek için ayrı bir maskleyici div */}
        <div className="absolute inset-0 rounded overflow-hidden pointer-events-none z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/10 via-[#8e7556]/5 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        </div>

        <div className="max-w-2xl relative z-10 flex flex-col gap-3">
          <span className="self-center lg:self-start text-[10px] font-extrabold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded border border-primary/20 animate-[fadeIn_0.4s_ease-out] flex items-center gap-1.5 shadow-[0_0_15px_rgba(197,168,128,0.15)]">
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> En Viral Şarkı Kesitleri
          </span>
          <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            Tiktok Trendlerini <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-white via-gray-100 to-gray-300 text-transparent bg-clip-text">Spotify Kalitesiyle</span> Dinleyin
          </h2>
          <p className="text-sm lg:text-base text-gray-400 leading-relaxed mt-2">
            TikTok üzerinde viral olan en can alıcı şarkı nakaratlarını Spotify yüksek ses kalitesiyle anında dinleyin, kaydedin ve orijinal TikTok/Instagram ses sayfalarına tek tıkla ulaşın.
          </p>
        </div>

        {/* Canlı Arama Kutusu & Dropdown Menüsü */}
        <div ref={searchContainerRef} className="w-full max-w-xl relative z-20 flex flex-col gap-2.5">
          <div className="relative w-full flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Input
                type="text"
                placeholder="Sanatçı, şarkı veya müzik türü yazıp Enter'a basın..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => {
                  if (inputValue.trim()) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (focusedIndex >= 0 && focusedIndex < searchResults.length) {
                      const track = searchResults[focusedIndex];
                      const favRecord = favorites.find(f => f.spotifyId === track.id);
                      const playbackTrack = { 
                        ...track, 
                        customPreviewUrl: favRecord?.customPreviewUrl || resolvedCache[track.id]?.customPreviewUrl || undefined, 
                        tiktokVideoUrl: favRecord?.tiktokVideoUrl || resolvedCache[track.id]?.tiktokVideoUrl || undefined,
                        instagramAudioUrl: favRecord?.instagramAudioUrl || resolvedCache[track.id]?.instagramAudioUrl || undefined,
                        instagramVideoUrl: favRecord?.instagramVideoUrl || resolvedCache[track.id]?.instagramVideoUrl || undefined
                      };
                      playTrack(playbackTrack);
                      setIsDropdownOpen(false);
                    } else {
                      handleSearchSubmit();
                    }
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setIsDropdownOpen(true);
                    setFocusedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setFocusedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
                  } else if (e.key === "Escape") {
                    setIsDropdownOpen(false);
                  }
                }}
                icon={loading ? <Loader2 className="h-5 w-5 text-primary animate-spin" /> : <Search className="h-5 w-5" />}
              />
              {inputValue && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-4 text-gray-400 hover:text-white transition-colors cursor-pointer p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <Button
              variant="primary"
              onClick={handleSearchSubmit}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-600 hover:scale-[1.02] active:scale-95 transition-all text-xs font-black uppercase tracking-wider cursor-pointer shadow-[0_4px_15px_rgba(168,85,247,0.3)] shrink-0 h-[46px]"
            >
              Ara
            </Button>
          </div>

          {/* Son Aramalar */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-1 px-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider select-none">Son Aramalar:</span>
              {recentSearches.map((q, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white/5 border border-white/10 hover:border-primary/40 rounded-full px-3 py-1 transition-all">
                  <button
                    onClick={() => {
                      setInputValue(q);
                      setSearchQuery(q);
                      setIsDropdownOpen(true);
                    }}
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

          {/* Şarkı Arama Dropdown Önerilenler Paneli */}
          {isDropdownOpen && searchQuery.trim() !== "" && (
            <div 
              ref={dropdownRef}
              className="absolute top-[52px] left-0 right-0 z-50 bg-[#0b081e]/92 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.85)] max-h-[380px] overflow-y-auto p-3 flex flex-col gap-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-[fade-in_0.2s_ease-out]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-1 px-1">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  ÖNERİLEN ARAMA SONUÇLARI ({searchResults.length})
                </span>
                <button 
                  onClick={() => setIsDropdownOpen(false)}
                  className="text-gray-400 hover:text-white cursor-pointer p-0.5 rounded hover:bg-white/5 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
                  <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Şarkılar aranıyor...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-8 text-xs text-gray-500 font-semibold italic">
                  Eşleşen şarkı bulunamadı. Lütfen başka bir arama yapın.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {searchResults.map((track, index) => {
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
                    const isFocused = focusedIndex === index;

                    return (
                      <div 
                        key={track.id} 
                        data-index={index}
                        className={`flex items-center justify-between gap-3 p-2 rounded-xl border transition-all duration-75 ease-out ${
                          isFocused
                            ? "bg-white/12 border-primary/60 shadow-[0_0_15px_rgba(168,85,247,0.2)] scale-[1.005] ring-1 ring-primary/20"
                            : active 
                              ? "bg-white/10 border-primary/40 shadow-[0_0_12px_rgba(168,85,247,0.1)]" 
                              : "bg-white/3 border-white/5 hover:border-white/15 hover:bg-white/6 hover:scale-[1.002]"
                        }`}
                      >
                        <div 
                          onClick={() => playTrack(playbackTrack)}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="relative h-10 w-10 rounded-lg overflow-hidden shrink-0 border border-white/5 bg-black/20">
                            <img
                              src={track.albumArt}
                              alt={track.title}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              {resolvingStudioTrackId === track.id ? (
                                <Loader2 className="h-4 w-4 text-white animate-spin" />
                              ) : playing ? (
                                <Pause className="h-4.5 w-4.5 text-white fill-white" />
                              ) : (
                                <Play className="h-4.5 w-4.5 text-white fill-white translate-x-[0.5px]" />
                              )}
                            </div>
                            {resolvingStudioTrackId === track.id ? (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />
                              </div>
                            ) : playing && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-[2px]">
                                <span className="w-[2px] h-3 bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s" }} />
                                <span className="w-[2px] h-3 bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.3s" }} />
                                <span className="w-[2px] h-3 bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.5s" }} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-extrabold text-white text-xs truncate leading-tight group-hover:text-primary transition-colors font-sans">
                              {track.title}
                            </h5>
                            <p className="text-[10px] text-gray-400 truncate mt-0.5">{track.artist}</p>
                          </div>
                        </div>

                        {/* Dropdown Aksiyon Butonları */}
                        <div className="flex items-center gap-1 shrink-0">
                          {/* TikTok */}
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
                            className={`h-7 w-7 rounded-lg transition-colors duration-200 border flex items-center justify-center cursor-pointer ${
                              resolvingTrackId === track.id
                                ? "bg-white/5 border-white/10 text-gray-500"
                                : hasCustomTikTok 
                                  ? "bg-[#ff0050]/15 border-[#ff0050]/30 text-[#ff0050]" 
                                  : "bg-white/3 border-white/5 text-gray-400 hover:text-white hover:border-[#ff0050]/30"
                            }`}
                            title="TikTok Sesini Çöz"
                          >
                            {resolvingTrackId === track.id ? (
                              <Loader2 className="h-3.5 w-3.5 text-[#ff0050] animate-spin" />
                            ) : (
                              <TikTokIcon className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Instagram */}
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
                            className={`h-7 w-7 rounded-lg transition-colors duration-200 border flex items-center justify-center cursor-pointer ${
                              resolvingInstagramTrackId === track.id
                                ? "bg-white/5 border-white/10 text-gray-500"
                                : hasCustomInstagram 
                                  ? "bg-[#833ab4]/15 border-[#833ab4]/30 text-[#fd1d1d]" 
                                  : "bg-white/3 border-white/5 text-gray-400 hover:text-white hover:border-[#833ab4]/30"
                            }`}
                            title="Instagram Sesini Çöz"
                          >
                            {resolvingInstagramTrackId === track.id ? (
                              <Loader2 className="h-3.5 w-3.5 text-[#fd1d1d] animate-spin" />
                            ) : (
                              <InstagramIcon className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {/* Favori */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFavorite(playbackTrack)}
                            className={`h-7 w-7 hover:bg-white/5 cursor-pointer rounded-lg transition-colors duration-200 ${
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
                            className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all duration-200 cursor-pointer"
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
          )}
        </div>
      </div>



      {/* Dinamik Trend Filtreleme Seçenekleri Paneli */}
      {searchQuery.trim() === "" && (
        <div className="w-full bg-[#0c0e12] border border-white/5 rounded-md p-4 shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-[fadeIn_0.5s_ease-out] flex flex-col lg:flex-row items-center gap-4">
          {/* Dil Seçimi */}
          <div className="flex-1 flex flex-col gap-1.5 w-full">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center lg:text-left select-none">Dil Seçimi</span>
            <div className="grid grid-cols-3 gap-1 bg-white/3 border border-white/5 p-0.5 rounded">
              <button
                onClick={() => setDiscoverLanguage("all")}
                className={`py-1.5 rounded text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                  discoverLanguage === "all"
                    ? "bg-[#c5a880] text-black font-black shadow-[0_2px_8px_rgba(197,168,128,0.2)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Hepsi
              </button>
              <button
                onClick={() => setDiscoverLanguage("tr")}
                className={`py-1.5 rounded text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                  discoverLanguage === "tr"
                    ? "bg-[#c5a880] text-black font-black shadow-[0_2px_8px_rgba(197,168,128,0.2)]"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Türkçe
              </button>
              <button
                onClick={() => setDiscoverLanguage("global")}
                className={`py-1.5 rounded text-[10px] font-bold transition-all duration-300 cursor-pointer ${
                  discoverLanguage === "global"
                    ? "bg-[#c5a880] text-black font-black shadow-[0_2px_8px_rgba(197,168,128,0.2)]"
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
            <div className="grid grid-cols-6 gap-1 bg-white/3 border border-white/5 p-0.5 rounded">
              {(["all", "pop", "rap", "rock", "dance", "r&b"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setDiscoverGenre(g)}
                  className={`py-1.5 rounded text-[9px] font-black transition-all duration-300 cursor-pointer uppercase ${
                    discoverGenre === g
                      ? "bg-[#c5a880] text-black shadow-[0_2px_8px_rgba(197,168,128,0.2)]"
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/2 border border-white/5 rounded-md p-4 backdrop-blur-sm animate-[fadeIn_0.6s_ease-out]">
        <div className="flex flex-col gap-1.5 p-3 rounded bg-white/3 border border-white/5">
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><Compass className="h-3 w-3 text-primary" /> Toplam Şarkı</span>
          <h4 className="text-xl font-black text-white">{stats.total} <span className="text-xs text-gray-400 font-bold">Adet</span></h4>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded bg-white/3 border border-white/5">
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><TrendingUp className="h-3 w-3 text-primary" /> Trend Skoru</span>
          <h4 className="text-xl font-black text-primary">%{stats.popularityScore} <span className="text-xs text-gray-400 font-bold">Popüler</span></h4>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded bg-white/3 border border-white/5">
          <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest flex items-center gap-1"><TikTokIcon className="h-3 w-3 text-white" /> Çözülen TikTok</span>
          <h4 className="text-xl font-black text-white">{stats.resolvedTikTok} <span className="text-xs text-gray-400 font-bold">Viral Ses</span></h4>
        </div>
        <div className="flex flex-col gap-1.5 p-3 rounded bg-white/3 border border-white/5">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 animate-[fadeIn_0.5s_ease-out]">
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
                  className={`relative overflow-hidden group border transition-[background-color,border-color,box-shadow] duration-200 flex flex-col justify-between p-2.5 rounded-2xl ${
                    active 
                      ? "bg-white/10 border-primary/50 shadow-[0_0_15px_rgba(168,85,247,0.2)]" 
                      : "bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8 hover:shadow-[0_8px_20px_rgba(0,0,0,0.3)]"
                  }`}
                >
                  <div className="relative z-10 flex flex-col gap-2.5 flex-1">
                    {/* Albüm Resmi ve Play Buton Hover */}
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow border border-white/5 bg-black/20">
                      <img
                        src={track.albumArt}
                        alt={track.title}
                        className="h-full w-full object-cover"
                      />
                      
                      {/* Glassy Badges over Image */}
                      {badge && (
                        <div className="absolute top-1.5 right-1.5 flex gap-1 z-20">
                          <span className="px-1.5 py-0.5 text-[7px] font-black rounded bg-black/75 text-white border border-white/10 select-none">
                            {badge.lang}
                          </span>
                          <span className="px-1.5 py-0.5 text-[7px] font-black rounded bg-primary/90 text-white border border-primary/20 select-none">
                            {badge.genre}
                          </span>
                        </div>
                      )}

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-200">
                        <button
                          onClick={() => playTrack(playbackTrack)}
                          disabled={resolvingStudioTrackId === track.id}
                          className="h-9 w-9 bg-primary text-white rounded-full flex items-center justify-center active:scale-90 hover:scale-105 transition-transform cursor-pointer shadow-[0_4px_12px_rgba(168,85,247,0.5)] disabled:opacity-80"
                        >
                          {resolvingStudioTrackId === track.id ? (
                            <Loader2 className="h-4 w-4 text-white animate-spin" />
                          ) : playing ? (
                            <Pause className="h-4 w-4 fill-white" />
                          ) : (
                            <Play className="h-4 w-4 fill-white translate-x-[0.5px]" />
                          )}
                        </button>
                      </div>
                      
                      {/* Oynatılıyor Dalga Animasyonu veya Yükleniyor Spinner'ı */}
                      {resolvingStudioTrackId === track.id ? (
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-1.5">
                          <Loader2 className="h-6 w-6 text-primary animate-spin" />
                          <span className="text-[9px] text-primary font-black uppercase tracking-wider">Hit Aranıyor...</span>
                        </div>
                      ) : playing && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center gap-[2px]">
                          <span className="w-[2.5px] h-6 bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s" }} />
                          <span className="w-[2.5px] h-6 bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.3s" }} />
                          <span className="w-[2.5px] h-6 bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.5s" }} />
                        </div>
                      )}
                    </div>

                    {/* Şarkı Bilgileri */}
                    <div className="min-w-0 flex flex-col justify-center px-1">
                      <h4 className="font-extrabold text-white text-xs sm:text-sm truncate group-hover:text-primary transition-colors font-sans leading-tight">
                        {track.title}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-gray-400 font-medium truncate mt-0.5">{track.artist}</p>
                    </div>
                  </div>

                  {/* Alt Kontrol Paneli - Daha Kompakt */}
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between gap-1 relative z-10 px-1">
                    {/* Sol Grup - Ses Çözücüler */}
                    <div className="flex items-center gap-1">
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
                        className={`h-7 w-7 rounded-lg transition-all duration-300 relative overflow-hidden border cursor-pointer ${
                          resolvingTrackId === track.id
                            ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                            : hasCustomTikTok 
                              ? "bg-[#ff0050]/15 border-[#ff0050]/40 text-[#ff0050] shadow-[0_0_8px_rgba(255,0,80,0.2)] animate-pulse-glow" 
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#ff0050]/40 hover:bg-[#ff0050]/5"
                        }`}
                        title={hasCustomTikTok ? "TikTok Sesi Aktif!" : "TikTok Sesi Çöz"}
                      >
                        {resolvingTrackId === track.id ? (
                          <Loader2 className="h-3 w-3 text-[#ff0050] animate-spin" />
                        ) : (
                          <>
                            {hasCustomTikTok && (
                              <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00f2fe]"></span>
                              </span>
                            )}
                            <TikTokIcon className="h-3.5 w-3.5" />
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
                        className={`h-7 w-7 rounded-lg transition-all duration-300 relative overflow-hidden border cursor-pointer ${
                          resolvingInstagramTrackId === track.id
                            ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                            : hasCustomInstagram 
                              ? "bg-gradient-to-tr from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/10 border-[#833ab4]/40 text-[#fd1d1d] shadow-[0_0_12px_rgba(131,58,180,0.25)] animate-pulse-glow" 
                              : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#833ab4]/40 hover:bg-[#833ab4]/5"
                        }`}
                        title={hasCustomInstagram ? "Instagram Sesi Aktif!" : "Instagram Sesi Çöz"}
                      >
                        {resolvingInstagramTrackId === track.id ? (
                          <Loader2 className="h-3 w-3 text-[#fd1d1d] animate-spin" />
                        ) : (
                          <>
                            {hasCustomInstagram && (
                              <span className="absolute top-0 right-0 flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcb045] opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#fcb045]"></span>
                              </span>
                            )}
                            <InstagramIcon className="h-3.5 w-3.5" />
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Sağ Grup - Kullanıcı Etkileşimi */}
                    <div className="flex items-center gap-1">
                      {/* Favori */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleFavorite(playbackTrack)}
                        className={`h-7 w-7 hover:bg-white/5 cursor-pointer rounded-lg transition-colors ${
                          isFavorite(track.id) ? "text-red-500 bg-red-500/10 border border-red-500/20" : "text-gray-400 hover:text-white"
                        }`}
                        title="Favorile"
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
                        className="h-7 w-7 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg border border-transparent hover:border-white/10 cursor-pointer"
                        title="Koleksiyona Ekle"
                      >
                        <Plus className="h-3.5 w-3.5" />
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
                          disabled={resolvingStudioTrackId === track.id}
                          className="h-7 w-7 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer shadow disabled:opacity-80"
                        >
                          {resolvingStudioTrackId === track.id ? (
                            <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                          ) : playing ? (
                            <Pause className="h-3.5 w-3.5 fill-white" />
                          ) : (
                            <Play className="h-3.5 w-3.5 fill-white translate-x-[0.5px]" />
                          )}
                        </button>
                      </div>
                      {resolvingStudioTrackId === track.id ? (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="h-4 w-4 text-primary animate-spin" />
                        </div>
                      ) : playing && (
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
                      <div className="flex items-center gap-2 min-w-0">
                        <h4 className="font-extrabold text-white text-xs truncate leading-tight group-hover:text-primary transition-colors font-sans flex-1 min-w-0">
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
    </div>
  );
}
