import { useState, useEffect, useRef } from "react";
import { signIn, signOut } from "next-auth/react";
import { searchTracks, searchTracksBulk, SpotifyTrack, resolveTrackPreviewUrl } from "@/app/actions/spotify";
import { TRENDING_HITS } from "@/constants/trendingHits";
import {
  getCollections,
  createCollection,
  deleteCollection,
  addTrackToCollection,
  removeTrackFromCollection,
  getFavorites,
  toggleFavorite,
  DBCollection,
  DBFavorite,
  saveTikTokAudioToFavorite,
  saveTikTokAudioToTrack,
  saveInstagramAudioToFavorite,
  saveInstagramAudioToTrack,
  isDbConnected
} from "@/app/actions/database";
import { extractTikTokAudio, autoResolveTikTokAudio, autoResolveInstagramAudio } from "@/app/actions/tiktok";

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function useDashboard(initialSession: any) {
  
  // --- STATE ---
  const [session, setSession] = useState(initialSession);
  const [activeTab, setActiveTab] = useState<"discover" | "collections" | "favorites" | "roulette">("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [discoverLanguage, setDiscoverLanguage] = useState<"all" | "tr" | "global">("all");
  const [discoverGenre, setDiscoverGenre] = useState<"all" | "pop" | "rap" | "rock" | "dance" | "r&b">("all");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [searchResults, setSearchResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Son aramalar geçmişi
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // Veritabanı ve Yerel Depolama (Fallback) State'leri
  const [collections, setCollections] = useState<DBCollection[]>([]);
  const [favorites, setFavorites] = useState<DBFavorite[]>([]);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [dbNoticeShown, setDbNoticeShown] = useState(true);

  // Modallar
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginUsername, setLoginUsername] = useState("");
  const [isCreateCollectionOpen, setIsCreateCollectionOpen] = useState(false);
  const [newCollName, setNewCollName] = useState("");
  const [newCollDesc, setNewCollDesc] = useState("");
  const [isAddToCollectionOpen, setIsAddToCollectionOpen] = useState(false);
  const [selectedTrackToAddToCollection, setSelectedTrackToAddToCollection] = useState<SpotifyTrack | null>(null);

  // TikTok & Instagram Ses Çözücü State'leri
  const [isTikTokResolverOpen, setIsTikTokResolverOpen] = useState(false);
  const [selectedTrackForTikTok, setSelectedTrackForTikTok] = useState<{
    id: string;
    type: "favorite" | "collection" | "discover";
    collectionId?: string;
    title?: string;
    artist?: string;
    albumArt?: string;
    previewUrl?: string;
  } | null>(null);
  const [tiktokInputUrl, setTiktokInputUrl] = useState("");
  const [resolvingTikTok, setResolvingTikTok] = useState(false);
  const [tiktokResolveError, setTiktokResolveError] = useState("");
  const [resolvingTrackId, setResolvingTrackId] = useState<string | null>(null);
  const [resolvingInstagramTrackId, setResolvingInstagramTrackId] = useState<string | null>(null);
  const [resolvingStudioTrackId, setResolvingStudioTrackId] = useState<string | null>(null);

  // Çözümlenmiş sesler için önbellek (caching)
  const [resolvedCache, setResolvedCache] = useState<Record<string, {
    customPreviewUrl?: string;
    tiktokVideoUrl?: string;
    instagramAudioUrl?: string;
    instagramVideoUrl?: string;
  }>>({});

  // Viral Rulet State'leri
  const [spinning, setSpinning] = useState(false);
  const [rouletteTrack, setRouletteTrack] = useState<SpotifyTrack | null>(null);
  const [rouletteError, setRouletteError] = useState("");
  const [resolvingRouletteTikTok, setResolvingRouletteTikTok] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"all" | "tr" | "global">("all");
  const [selectedGenre, setSelectedGenre] = useState<"all" | "pop" | "rap" | "rock" | "dance" | "r&b">("all");
  const [rouletteHistory, setRouletteHistory] = useState<string[]>([]);

  // Ses Oynatıcı (Audio Player) State'leri
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [audioSourceMode, setAudioSourceMode] = useState<"spotify" | "tiktok" | "instagram">("spotify");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);

  // Otomatik Misafir Oturumu Entegrasyonu
  useEffect(() => {
    if (!session) {
      const guestSession = {
        user: {
          id: "guest_user",
          name: "Misafir Kullanıcı",
          email: "guest@viralsound.local"
        },
        expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      };
      setSession(guestSession);
    }
  }, [session]);

  // --- KULLANICI GİRİŞ/ÇIKIŞ VE YÜKLEME ---
  useEffect(() => {
    // Ses nesnesini tarayıcıda oluştur
    audioRef.current = new Audio();
    audioRef.current.volume = volume;

    // Yerel verileri (son aramalar, dbNotice) tarayıcı ortamında güvenle yükle (SSR Hydration hatasını önlemek için)
    if (typeof window !== "undefined") {
      const savedSearches = localStorage.getItem("vsh_recent_searches");
      if (savedSearches) {
        try {
          setRecentSearches(JSON.parse(savedSearches));
        } catch (e) {
          console.error("Son aramalar yüklenirken hata oluştu:", e);
        }
      }

      const savedNotice = localStorage.getItem("vsh_hide_db_notice");
      if (savedNotice === "true") {
        setDbNoticeShown(false);
      }
    }

    // Ses dinleyicileri
    const audio = audioRef.current;
    
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration || 30);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Ses Oynatıcı Kontrolleri
  const playTrack = (track: SpotifyTrack, sourceMode?: "spotify" | "tiktok" | "instagram") => {
    if (!audioRef.current) return;

    // Hangi ses kaynağını çalacağımızı belirliyoruz (Öncelik her zaman stüdyo kalitesindeki Orijinal Hit sesindedir!)
    let targetSourceMode = sourceMode || "spotify";

    let audioSource = track.previewUrl;
    if (targetSourceMode === "tiktok" && track.customPreviewUrl) {
      audioSource = track.customPreviewUrl;
    } else if (targetSourceMode === "instagram" && track.instagramAudioUrl) {
      audioSource = track.instagramAudioUrl;
    }

    // EĞER SEÇİLEN KAYNAK SESİ BULUNAMAZSA (BOŞSA) AKILLI FALLBACK DEVREYE GİRER!
    if (!audioSource || audioSource.trim() === "") {
      if (targetSourceMode === "spotify") {
        console.log(`[JIT] "${track.title}" için stüdyo kesiti JIT ile çözülüyor...`);
        setResolvingStudioTrackId(track.id);
        
        // JIT Çözücü Server Action Çağır
        resolveTrackPreviewUrl(track.artist, track.title, track.id)
          .then((resolvedUrl) => {
            setResolvingStudioTrackId(null);
            if (resolvedUrl) {
              const updatedTrack = {
                ...track,
                previewUrl: resolvedUrl
              };
              
              // Eyaletleri güncelle ki UI'da da previewUrl dolu gözüksün
              setTracks(prev => prev.map(t => t.id === track.id ? { ...t, previewUrl: resolvedUrl } : t));
              setSearchResults(prev => prev.map(t => t.id === track.id ? { ...t, previewUrl: resolvedUrl } : t));
              
              // Çalmaya başla
              playTrack(updatedTrack, "spotify");
            } else {
              // Bulamazsa TikTok fallback'e geç
              console.log(`[JIT Fallback] "${track.title}" stüdyo kesiti bulunamadı, TikTok fallback devreye giriyor...`);
              handleFallback();
            }
          })
          .catch((err) => {
            console.error("JIT Çözümleme Hatası:", err);
            setResolvingStudioTrackId(null);
            handleFallback();
          });

        const handleFallback = () => {
          if (track.instagramAudioUrl) {
            playTrack(track, "instagram");
          } else if (track.customPreviewUrl) {
            playTrack(track, "tiktok");
          } else {
            console.log(`[Oynatıcı Fallback] Arka planda TikTok sesi otomatik çözülüyor...`);
            handleAutoResolveTikTok({
              id: track.id,
              title: track.title,
              artist: track.artist,
              type: activeTab === "discover" ? "discover" : activeTab === "favorites" ? "favorite" : "collection",
              albumArt: track.albumArt,
              previewUrl: track.previewUrl
            });
          }
        };
        return;
      }

      if (track.instagramAudioUrl) {
        targetSourceMode = "instagram";
        audioSource = track.instagramAudioUrl;
      } else if (track.customPreviewUrl) {
        targetSourceMode = "tiktok";
        audioSource = track.customPreviewUrl;
      } else {
        // Hiçbir çözülmüş ses yoksa ve stüdyo da boşsa, otomatik olarak arka planda TikTok sesini çözüp çalmaya başla!
        console.log(`[Oynatıcı Fallback] "${track.title}" için stüdyo kesiti bulunamadı, arka planda TikTok sesi otomatik çözülüyor...`);
        handleAutoResolveTikTok({
          id: track.id,
          title: track.title,
          artist: track.artist,
          type: activeTab === "discover" ? "discover" : activeTab === "favorites" ? "favorite" : "collection",
          albumArt: track.albumArt,
          previewUrl: track.previewUrl
        });
        return; // handleAutoResolveTikTok çözünce kendisi playTrack çağıracaktır
      }
    }

    // Eğer şu an çalınan şarkı ile hedef şarkı aynıysa VE çalınan kaynak modu ile hedef kaynak modu aynıysa duraklat/devam et
    if (currentTrack?.id === track.id && targetSourceMode === audioSourceMode) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      // Kaynak modu veya şarkı değiştiğinde yeni kaynağı yükle ve çal
      setAudioSourceMode(targetSourceMode);
      audioRef.current.src = audioSource || "";
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(() => {
          setIsPlaying(false);
        });
      setCurrentTrack(track);
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const clickPercentage = clickX / width;
    const newTime = clickPercentage * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // --- VERİ ÇEKME ---
  const loadUserData = async () => {
    if (!session?.user?.id) return;
    
    // Veritabanı bağlantısını kontrol et
    const connected = await isDbConnected();
    const isGuest = session.user.id === "guest_user";
    
    if (!connected || isGuest) {
      // Bağlantı yok veya misafir kullanıcı, yerel depolamadan yükle
      const localColls = localStorage.getItem(`vsh_colls_${session.user.id}`);
      const localFavs = localStorage.getItem(`vsh_favs_${session.user.id}`);
      
      try {
        setCollections(localColls ? JSON.parse(localColls) : []);
      } catch (e) {
        setCollections([]);
      }

      try {
        setFavorites(localFavs ? JSON.parse(localFavs) : []);
      } catch (e) {
        setFavorites([]);
      }
      setIsLocalMode(true);
    } else {
      // Bağlantı var ve gerçek kullanıcı, veritabanından yükle
      const dbCollections = await getCollections(session.user.id);
      const dbFavorites = await getFavorites(session.user.id);
      setCollections(dbCollections);
      setFavorites(dbFavorites);
      setIsLocalMode(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [session]);

  // Arama İşlemi (Tetikleyici Bazlı & Dinamik Trend Filtreleme)
  useEffect(() => {
    // Arama boşsa trendleri yükle, doluysa gecikmesiz direkt arat
    const delay = searchQuery.trim() === "" ? 150 : 0;
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      
      if (searchQuery.trim() === "") {
        // discoverLanguage ve discoverGenre filtrelerine uyan trend şarkıları süz
        let filteredHits = TRENDING_HITS;
        if (discoverLanguage !== "all") {
          filteredHits = filteredHits.filter(h => h.language === discoverLanguage);
        }
        if (discoverGenre !== "all") {
          filteredHits = filteredHits.filter(h => h.genre === discoverGenre);
        }
        
        // Rastgele karıştır (Anti-Repeat)
        const shuffledHits = shuffleArray(filteredHits);
        
        // İlk 10 şarkıyı paralel olarak iTunes/Spotify üzerinden hızlıca aratıp getir
        const initialHits = shuffledHits.slice(0, 10);
        const remainingHits = shuffledHits.slice(10, 30);
        
        // Önceki şarkıları sıfırlayarak anlık geçiş hissini güçlendir
        setTracks([]);
        setSearchResults([]);

        const initialQueries = initialHits.map(hit => `${hit.artist} ${hit.title}`);
        
        searchTracksBulk(initialQueries).then(validTracks => {
          setTracks(validTracks);
          setLoading(false);

          // Kalan 20 şarkıyı tek bir arka plan toplu isteği (Bulk) ile 600ms sonra yükle
          const remainingQueries = remainingHits.map(hit => `${hit.artist} ${hit.title}`);
          if (remainingQueries.length > 0) {
            setTimeout(() => {
              searchTracksBulk(remainingQueries).then(validRemaining => {
                setTracks(prev => {
                  const existingIds = new Set(prev.map(t => t.id));
                  const uniqueNew = validRemaining.filter(t => !existingIds.has(t.id));
                  return [...prev, ...uniqueNew];
                });
              });
            }, 600);
          }
        });
      } else {
        // Normal arama sorgusu çalıştır ve searchResults state'ine yaz
        searchTracks(searchQuery).then((res) => {
          setSearchResults(res);
          setLoading(false);
          
          // Son aramaları kaydet
          if (searchQuery.trim().length > 1) {
            setRecentSearches(prev => {
              const cleanQuery = searchQuery.trim();
              const filtered = prev.filter(q => q.toLowerCase() !== cleanQuery.toLowerCase());
              const updated = [cleanQuery, ...filtered].slice(0, 5);
              localStorage.setItem("vsh_recent_searches", JSON.stringify(updated));
              return updated;
            });
          }
        });
      }
    }, delay);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, discoverLanguage, discoverGenre]);

  // --- LOCALSTORAGE VERİ YAZMA YARDIMCILARI ---
  const saveLocalCollections = (newColls: DBCollection[]) => {
    if (session?.user?.id) {
      localStorage.setItem(`vsh_colls_${session.user.id}`, JSON.stringify(newColls));
      setCollections(newColls);
    }
  };

  const saveLocalFavorites = (newFavs: DBFavorite[]) => {
    if (session?.user?.id) {
      localStorage.setItem(`vsh_favs_${session.user.id}`, JSON.stringify(newFavs));
      setFavorites(newFavs);
    }
  };

  // --- ACTIONS ---

  // Giriş Yap
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail) return;

    // Credentials login tetikleme
    const result = await signIn("credentials", {
      email: loginEmail,
      name: loginUsername || "Viral Creator",
      redirect: false
    });

    if (result?.ok) {
      // Mock oturum güncelleme
      setSession({
        user: {
          id: `usr_${Date.now()}`,
          name: loginUsername || "Viral Creator",
          email: loginEmail
        }
      });
      setIsLoginOpen(false);
    }
  };

  // Yerel Çalışma Modu Bildirim Kapatma (Kalıcı hale getirme)
  const handleCloseDbNotice = () => {
    setDbNoticeShown(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("vsh_hide_db_notice", "true");
    }
  };

  // Çıkış Yap
  const handleSignOut = async () => {
    await signOut({ redirect: false });
    setSession(null);
    setCollections([]);
    setFavorites([]);
    setCurrentTrack(null);
    setIsPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  };

  // Koleksiyon Oluşturma
  const handleCreateCollection = async () => {
    if (!newCollName || !session?.user?.id) return;

    const isGuest = session?.user?.id === "guest_user";
    if (isLocalMode || isGuest) {
      const newColl: DBCollection = {
        id: `coll_${Date.now()}`,
        name: newCollName,
        description: newCollDesc,
        tracks: [],
        createdAt: new Date()
      };
      const updated = [newColl, ...collections];
      saveLocalCollections(updated);
      setIsCreateCollectionOpen(false);
      setNewCollName("");
      setNewCollDesc("");
    } else {
      const res = await createCollection(session.user.id, newCollName, newCollDesc);
      if (res.success) {
        loadUserData();
        setIsCreateCollectionOpen(false);
        setNewCollName("");
        setNewCollDesc("");
      } else if (res.error === "DB_NOT_CONNECTED") {
        // Fallback local mode
        setIsLocalMode(true);
        const newColl: DBCollection = {
          id: `coll_${Date.now()}`,
          name: newCollName,
          description: newCollDesc,
          tracks: [],
          createdAt: new Date()
        };
        const updated = [newColl, ...collections];
        saveLocalCollections(updated);
        setIsCreateCollectionOpen(false);
        setNewCollName("");
        setNewCollDesc("");
      }
    }
  };

  // Koleksiyon Silme
  const handleDeleteCollection = async (collId: string) => {
    const isGuest = session?.user?.id === "guest_user";
    if (isLocalMode || isGuest) {
      const updated = collections.filter(c => c.id !== collId);
      saveLocalCollections(updated);
    } else {
      const res = await deleteCollection(collId);
      if (res.success) {
        loadUserData();
      } else {
        const updated = collections.filter(c => c.id !== collId);
        saveLocalCollections(updated);
      }
    }
  };

  // Şarkıyı Koleksiyona Ekleme
  const handleAddTrackToCollection = async (collId: string) => {
    if (!selectedTrackToAddToCollection) return;

    const trackData = {
      spotifyId: selectedTrackToAddToCollection.id,
      title: selectedTrackToAddToCollection.title,
      artist: selectedTrackToAddToCollection.artist,
      albumArt: selectedTrackToAddToCollection.albumArt,
      previewUrl: selectedTrackToAddToCollection.previewUrl
    };

    const isGuest = session?.user?.id === "guest_user";
    if (isLocalMode || isGuest) {
      const updated = collections.map(c => {
        if (c.id === collId) {
          // Zaten ekli mi kontrol et
          if (c.tracks.some(t => t.spotifyId === trackData.spotifyId)) return c;
          return {
            ...c,
            tracks: [...c.tracks, { id: `tr_${Date.now()}`, ...trackData }]
          };
        }
        return c;
      });
      saveLocalCollections(updated);
      setIsAddToCollectionOpen(false);
      setSelectedTrackToAddToCollection(null);
    } else {
      const res = await addTrackToCollection(collId, trackData);
      if (res.success) {
        loadUserData();
        setIsAddToCollectionOpen(false);
        setSelectedTrackToAddToCollection(null);
      } else {
        // Local mode fallback
        const updated = collections.map(c => {
          if (c.id === collId) {
            if (c.tracks.some(t => t.spotifyId === trackData.spotifyId)) return c;
            return {
              ...c,
              tracks: [...c.tracks, { id: `tr_${Date.now()}`, ...trackData }]
            };
          }
          return c;
        });
        saveLocalCollections(updated);
        setIsAddToCollectionOpen(false);
        setSelectedTrackToAddToCollection(null);
      }
    }
  };

  // Şarkıyı Koleksiyondan Çıkarma
  const handleRemoveTrackFromCollection = async (collId: string, spotifyId: string) => {
    const isGuest = session?.user?.id === "guest_user";
    if (isLocalMode || isGuest) {
      const updated = collections.map(c => {
        if (c.id === collId) {
          return {
            ...c,
            tracks: c.tracks.filter(t => t.spotifyId !== spotifyId)
          };
        }
        return c;
      });
      saveLocalCollections(updated);
    } else {
      const res = await removeTrackFromCollection(collId, spotifyId);
      if (res.success) {
        loadUserData();
      } else {
        const updated = collections.map(c => {
          if (c.id === collId) {
            return {
              ...c,
              tracks: c.tracks.filter(t => t.spotifyId !== spotifyId)
            };
          }
          return c;
        });
        saveLocalCollections(updated);
      }
    }
  };

  // Favoriye Ekle / Çıkar (Toggle)
  const handleToggleFavorite = async (track: SpotifyTrack) => {
    if (!session?.user?.id) {
      setIsLoginOpen(true);
      return;
    }

    const trackData = {
      spotifyId: track.id,
      title: track.title,
      artist: track.artist,
      albumArt: track.albumArt,
      previewUrl: track.previewUrl
    };

    const isGuest = session?.user?.id === "guest_user";
    if (isLocalMode || isGuest) {
      const exists = favorites.some(f => f.spotifyId === track.id);
      let updated;
      if (exists) {
        updated = favorites.filter(f => f.spotifyId !== track.id);
      } else {
        updated = [{ id: `fav_${Date.now()}`, ...trackData, createdAt: new Date() }, ...favorites];
      }
      saveLocalFavorites(updated);
    } else {
      const res = await toggleFavorite(session.user.id, trackData);
      if (res.success) {
        loadUserData();
      } else {
        // Local mode fallback
        const exists = favorites.some(f => f.spotifyId === track.id);
        let updated;
        if (exists) {
          updated = favorites.filter(f => f.spotifyId !== track.id);
        } else {
          updated = [{ id: `fav_${Date.now()}`, ...trackData, createdAt: new Date() }, ...favorites];
        }
        saveLocalFavorites(updated);
      }
    }
  };

  const isFavorite = (trackId: string) => {
    return favorites.some(f => f.spotifyId === trackId);
  };

// TikTok & Instagram Ses Çözücü Fonksiyonu (Birleşik Hit Ayarlayıcı)
  const handleResolveTikTokAudio = async () => {
    if (!selectedTrackForTikTok || !tiktokInputUrl) return;

    setResolvingTikTok(true);
    setTiktokResolveError("");

    try {
      const url = tiktokInputUrl.trim();
      const { id, type, collectionId } = selectedTrackForTikTok;

      // 1. Instagram Reels linki mi?
      if (url.includes("instagram.com") || url.includes("reels")) {
        // Instagram Reels linki doğrudan çözülemediği için (Cloudflare engeli),
        // arka planda şarkının Reels versiyonunu aratıp entegre ediyoruz.
        const resolved = await autoResolveInstagramAudio(selectedTrackForTikTok.title || "", selectedTrackForTikTok.artist || "");
        
        if (!resolved || !resolved.playUrl) {
          setTiktokResolveError("Bu şarkı için Instagram Reels uyumlu bir viral ses TikTok üzerinde bulunamadı.");
          setResolvingTikTok(false);
          return;
        }

        const { playUrl, videoUrl } = resolved;

        const isGuest = session?.user?.id === "guest_user";
        if (isLocalMode || isGuest) {
          if (type === "favorite") {
            const updatedFavs = favorites.map(f => {
              if (f.spotifyId === id) {
                return { ...f, instagramAudioUrl: playUrl, instagramVideoUrl: url };
              }
              return f;
            });
            saveLocalFavorites(updatedFavs);
          } else if (type === "discover") {
            const trackData = {
              spotifyId: id,
              title: selectedTrackForTikTok.title || "",
              artist: selectedTrackForTikTok.artist || "",
              albumArt: selectedTrackForTikTok.albumArt || "",
              previewUrl: selectedTrackForTikTok.previewUrl || ""
            };
            const exists = favorites.some(f => f.spotifyId === id);
            let updated = [...favorites];
            if (!exists) {
              updated = [{ id: `fav_${Date.now()}`, ...trackData, createdAt: new Date() }, ...favorites];
            }
            const updatedFavs = updated.map(f => {
              if (f.spotifyId === id) {
                return { ...f, instagramAudioUrl: playUrl, instagramVideoUrl: url };
              }
              return f;
            });
            saveLocalFavorites(updatedFavs);
          } else if (type === "collection" && collectionId) {
            const updatedColls = collections.map(c => {
              if (c.id === collectionId) {
                return {
                  ...c,
                  tracks: c.tracks.map(t => {
                    if (t.spotifyId === id) {
                      return { ...t, instagramAudioUrl: playUrl, instagramVideoUrl: url };
                    }
                    return t;
                  })
                };
              }
              return c;
            });
            saveLocalCollections(updatedColls);
          }
        } else {
          if (type === "favorite" || type === "discover") {
            let favRecord = favorites.find(f => f.spotifyId === id);
            if (!favRecord) {
              const trackData = {
                spotifyId: id,
                title: selectedTrackForTikTok.title || "",
                artist: selectedTrackForTikTok.artist || "",
                albumArt: selectedTrackForTikTok.albumArt || "",
                previewUrl: selectedTrackForTikTok.previewUrl || ""
              };
              const res = await toggleFavorite(session.user.id, trackData);
              if (res.success) {
                const dbFavorites = await getFavorites(session.user.id);
                favRecord = dbFavorites.find(f => f.spotifyId === id);
              }
            }
            if (favRecord) {
              await saveInstagramAudioToFavorite(favRecord.id, url, playUrl);
            }
          } else if (type === "collection") {
            const coll = collections.find(c => c.id === collectionId);
            const trackRecord = coll?.tracks.find(t => t.spotifyId === id);
            if (trackRecord) {
              await saveInstagramAudioToTrack(trackRecord.id, url, playUrl);
            }
          }
          await loadUserData();
        }

        // Eğer şu an çalınan şarkı buysa, oynatıcıyı yeni ses ile güncelle
        if (currentTrack?.id === id) {
          const updatedTrack = {
            ...currentTrack,
            instagramAudioUrl: playUrl,
            instagramVideoUrl: url
          };
          setCurrentTrack(updatedTrack);
          playTrack(updatedTrack, "instagram");
        }

        setIsTikTokResolverOpen(false);
        setTiktokInputUrl("");
        setSelectedTrackForTikTok(null);

      } else if (url.includes("tiktok.com")) {
        // 2. TikTok videosundan doğrudan ses çöz
        const audioInfo = await extractTikTokAudio(url);

        if (!audioInfo || !audioInfo.playUrl) {
          setTiktokResolveError("TikTok ses linki bu videodan çözülemedi. Lütfen geçerli bir TikTok video paylaşım linki girdiğinizden emin olun.");
          setResolvingTikTok(false);
          return;
        }

        const { playUrl } = audioInfo;

        const isGuest = session?.user?.id === "guest_user";
        if (isLocalMode || isGuest) {
          if (type === "favorite") {
            const updatedFavs = favorites.map(f => {
              if (f.spotifyId === id) {
                return { ...f, customPreviewUrl: playUrl, tiktokVideoUrl: url };
              }
              return f;
            });
            saveLocalFavorites(updatedFavs);
          } else if (type === "discover") {
            const trackData = {
              spotifyId: id,
              title: selectedTrackForTikTok.title || "",
              artist: selectedTrackForTikTok.artist || "",
              albumArt: selectedTrackForTikTok.albumArt || "",
              previewUrl: selectedTrackForTikTok.previewUrl || ""
            };
            const exists = favorites.some(f => f.spotifyId === id);
            let updated = [...favorites];
            if (!exists) {
              updated = [{ id: `fav_${Date.now()}`, ...trackData, createdAt: new Date() }, ...favorites];
            }
            const updatedFavs = updated.map(f => {
              if (f.spotifyId === id) {
                return { ...f, customPreviewUrl: playUrl, tiktokVideoUrl: url };
              }
              return f;
            });
            saveLocalFavorites(updatedFavs);
          } else if (type === "collection" && collectionId) {
            const updatedColls = collections.map(c => {
              if (c.id === collectionId) {
                return {
                  ...c,
                  tracks: c.tracks.map(t => {
                    if (t.spotifyId === id) {
                      return { ...t, customPreviewUrl: playUrl, tiktokVideoUrl: url };
                    }
                    return t;
                  })
                };
              }
              return c;
            });
            saveLocalCollections(updatedColls);
          }
        } else {
          if (type === "favorite" || type === "discover") {
            let favRecord = favorites.find(f => f.spotifyId === id);
            if (!favRecord) {
              const trackData = {
                spotifyId: id,
                title: selectedTrackForTikTok.title || "",
                artist: selectedTrackForTikTok.artist || "",
                albumArt: selectedTrackForTikTok.albumArt || "",
                previewUrl: selectedTrackForTikTok.previewUrl || ""
              };
              const res = await toggleFavorite(session.user.id, trackData);
              if (res.success) {
                const dbFavorites = await getFavorites(session.user.id);
                favRecord = dbFavorites.find(f => f.spotifyId === id);
              }
            }
            if (favRecord) {
              await saveTikTokAudioToFavorite(favRecord.id, url, playUrl);
            }
          } else if (type === "collection") {
            const coll = collections.find(c => c.id === collectionId);
            const trackRecord = coll?.tracks.find(t => t.spotifyId === id);
            if (trackRecord) {
              await saveTikTokAudioToTrack(trackRecord.id, url, playUrl);
            }
          }
          await loadUserData();
        }

        // Eğer şu an çalınan şarkı buysa, oynatıcıyı yeni ses ile güncelle
        if (currentTrack?.id === id) {
          const updatedTrack = {
            ...currentTrack,
            customPreviewUrl: playUrl,
            tiktokVideoUrl: url
          };
          setCurrentTrack(updatedTrack);
          playTrack(updatedTrack, "tiktok");
        }

        setIsTikTokResolverOpen(false);
        setTiktokInputUrl("");
        setSelectedTrackForTikTok(null);
      } else {
        setTiktokResolveError("Lütfen geçerli bir TikTok Video veya Instagram Reels linki girin.");
      }
    } catch (err: any) {
      console.error("Çözme hatası:", err);
      setTiktokResolveError("Bir hata oluştu: " + err.message);
    } finally {
      setResolvingTikTok(false);
    }
  };

  // Otomatik TikTok Ses Çözücü Eylemi (Tek Tıkla Arka Planda Çözme)
  const handleAutoResolveTikTok = async (track: {
    id: string;
    title: string;
    artist: string;
    type: "favorite" | "collection" | "discover";
    collectionId?: string;
    albumArt?: string;
    previewUrl?: string;
  }) => {
    if (!session) {
      setIsLoginOpen(true);
      return;
    }

    setResolvingTrackId(track.id);
    setTiktokResolveError("");

    // Önce önbelleği kontrol et
    if (resolvedCache[track.id]?.customPreviewUrl) {
      const cachedUrl = resolvedCache[track.id].customPreviewUrl!;
      const cachedVideoUrl = resolvedCache[track.id].tiktokVideoUrl || "";
      
      const updatedTrack: SpotifyTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt || "",
        previewUrl: track.previewUrl || "",
        customPreviewUrl: cachedUrl,
        tiktokVideoUrl: cachedVideoUrl,
        tiktokUrl: `https://www.google.com/search?q=site:tiktok.com/music+${encodeURIComponent(`${track.artist} - ${track.title}`)}&btnI=I`
      };

      if (currentTrack?.id === track.id) {
        setCurrentTrack(updatedTrack);
        if (isPlaying && audioRef.current) {
          audioRef.current.src = cachedUrl;
          audioRef.current.load();
          audioRef.current.play().catch(() => {});
        }
      } else {
        playTrack(updatedTrack, "tiktok");
      }
      setResolvingTrackId(null);
      return;
    }
    
    try {
      // 1. TikTok'ta otomatik arama yap
      const resolved = await autoResolveTikTokAudio(track.title, track.artist);

      if (!resolved || !resolved.playUrl) {
        // Otomatik bulamadıysa, kullanıcıya manuel girmesi için modalı açıyoruz!
        setSelectedTrackForTikTok({
          id: track.id,
          type: track.type,
          collectionId: track.collectionId,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt,
          previewUrl: track.previewUrl
        });
        const favRecord = favorites.find(f => f.spotifyId === track.id);
        setTiktokInputUrl(favRecord?.tiktokVideoUrl || "");
        setTiktokResolveError("Otomatik TikTok sesi arandı ancak eşleşen viral bir video bulunamadı. Lütfen manuel olarak video URL'sini girin.");
        setIsTikTokResolverOpen(true);
        setResolvingTrackId(null);
        return;
      }

      const { playUrl, videoUrl } = resolved;
      const { id, type, collectionId } = track;

      // Önbelleğe kaydet
      setResolvedCache(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          customPreviewUrl: playUrl,
          tiktokVideoUrl: videoUrl
        }
      }));

      // 2. Veritabanına veya LocalStorage'a kaydet
      const isGuest = session?.user?.id === "guest_user";
      if (isLocalMode || isGuest) {
        if (type === "favorite") {
          const updatedFavs = favorites.map(f => {
            if (f.spotifyId === id) {
              return { ...f, customPreviewUrl: playUrl, tiktokVideoUrl: videoUrl };
            }
            return f;
          });
          saveLocalFavorites(updatedFavs);
        } else if (type === "discover") {
          const trackData = {
            spotifyId: id,
            title: track.title || "",
            artist: track.artist || "",
            albumArt: track.albumArt || "",
            previewUrl: track.previewUrl || ""
          };
          const exists = favorites.some(f => f.spotifyId === id);
          let updated = [...favorites];
          if (!exists) {
            updated = [{ id: `fav_${Date.now()}`, ...trackData, createdAt: new Date() }, ...favorites];
          }
          const updatedFavs = updated.map(f => {
            if (f.spotifyId === id) {
              return { ...f, customPreviewUrl: playUrl, tiktokVideoUrl: videoUrl };
            }
            return f;
          });
          saveLocalFavorites(updatedFavs);
        } else if (type === "collection" && collectionId) {
          const updatedColls = collections.map(c => {
            if (c.id === collectionId) {
              return {
                ...c,
                tracks: c.tracks.map(t => {
                  if (t.spotifyId === id) {
                    return { ...t, customPreviewUrl: playUrl, tiktokVideoUrl: videoUrl };
                  }
                  return t;
                })
              };
            }
            return c;
          });
          saveLocalCollections(updatedColls);
        }
      } else {
        if (type === "favorite" || type === "discover") {
          let favRecord = favorites.find(f => f.spotifyId === id);
          if (!favRecord) {
            const trackData = {
              spotifyId: id,
              title: track.title || "",
              artist: track.artist || "",
              albumArt: track.albumArt || "",
              previewUrl: track.previewUrl || ""
            };
            const res = await toggleFavorite(session.user.id, trackData);
            if (res.success) {
              const dbFavorites = await getFavorites(session.user.id);
              favRecord = dbFavorites.find(f => f.spotifyId === id);
            }
          }
          if (favRecord) {
            await saveTikTokAudioToFavorite(favRecord.id, videoUrl, playUrl);
          }
        } else if (type === "collection") {
          const coll = collections.find(c => c.id === collectionId);
          const trackRecord = coll?.tracks.find(t => t.spotifyId === id);
          if (trackRecord) {
            await saveTikTokAudioToTrack(trackRecord.id, videoUrl, playUrl);
          }
        }
        await loadUserData();
      }

      // 3. Eğer şu an çalınan şarkı buysa, oynatıcıyı yeni ses ile güncelle
      if (currentTrack?.id === id) {
        const updatedTrack = {
          ...currentTrack,
          customPreviewUrl: playUrl,
          tiktokVideoUrl: videoUrl
        };
        setCurrentTrack(updatedTrack);
        if (isPlaying && audioRef.current) {
          audioRef.current.src = playUrl;
          audioRef.current.load();
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.error("Otomatik TikTok çözme hatası:", err);
    } finally {
      setResolvingTrackId(null);
    }
  };

  // Otomatik Instagram Reels Ses Çözücü Eylemi (Tek Tıkla Arka Planda Çözme)
  const handleAutoResolveInstagram = async (track: {
    id: string;
    title: string;
    artist: string;
    type: "favorite" | "collection" | "discover";
    collectionId?: string;
    albumArt?: string;
    previewUrl?: string;
  }) => {
    if (!session) {
      setIsLoginOpen(true);
      return;
    }

    setResolvingInstagramTrackId(track.id);
    setTiktokResolveError("");

    // Önce önbelleği kontrol et
    if (resolvedCache[track.id]?.instagramAudioUrl) {
      const cachedUrl = resolvedCache[track.id].instagramAudioUrl!;
      const cachedVideoUrl = resolvedCache[track.id].instagramVideoUrl || "";
      
      const updatedTrack: SpotifyTrack = {
        id: track.id,
        title: track.title,
        artist: track.artist,
        albumArt: track.albumArt || "",
        previewUrl: track.previewUrl || "",
        instagramAudioUrl: cachedUrl,
        instagramVideoUrl: cachedVideoUrl,
        tiktokUrl: `https://www.google.com/search?q=site:tiktok.com/music+${encodeURIComponent(`${track.artist} - ${track.title}`)}&btnI=I`
      };

      if (currentTrack?.id === track.id) {
        setCurrentTrack(updatedTrack);
        if (isPlaying && audioRef.current && audioSourceMode === "instagram") {
          audioRef.current.src = cachedUrl;
          audioRef.current.load();
          audioRef.current.play().catch(() => {});
        }
      } else {
        playTrack(updatedTrack, "instagram");
      }
      setResolvingInstagramTrackId(null);
      return;
    }
    
    try {
      // 1. Instagram Reels'te otomatik arama yap
      const resolved = await autoResolveInstagramAudio(track.title, track.artist);

      if (!resolved || !resolved.playUrl) {
        // Otomatik bulamadıysa, kullanıcıya manuel girmesi için modalı açıyoruz!
        setSelectedTrackForTikTok({
          id: track.id,
          type: track.type,
          collectionId: track.collectionId,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt,
          previewUrl: track.previewUrl
        });
        const favRecord = favorites.find(f => f.spotifyId === track.id);
        setTiktokInputUrl(favRecord?.instagramVideoUrl || "");
        setTiktokResolveError("Otomatik Instagram Reels sesi arandı ancak eşleşen viral bir video bulunamadı. Lütfen manuel olarak video URL'sini girin.");
        setIsTikTokResolverOpen(true);
        setResolvingInstagramTrackId(null);
        return;
      }

      const { playUrl, videoUrl } = resolved;
      const { id, type, collectionId } = track;

      // Önbelleğe kaydet
      setResolvedCache(prev => ({
        ...prev,
        [id]: {
          ...prev[id],
          instagramAudioUrl: playUrl,
          instagramVideoUrl: videoUrl
        }
      }));

      // 2. Veritabanına veya LocalStorage'a kaydet
      const isGuest = session?.user?.id === "guest_user";
      if (isLocalMode || isGuest) {
        if (type === "favorite") {
          const updatedFavs = favorites.map(f => {
            if (f.spotifyId === id) {
              return { ...f, instagramAudioUrl: playUrl, instagramVideoUrl: videoUrl };
            }
            return f;
          });
          saveLocalFavorites(updatedFavs);
        } else if (type === "discover") {
          const trackData = {
            spotifyId: id,
            title: track.title || "",
            artist: track.artist || "",
            albumArt: track.albumArt || "",
            previewUrl: track.previewUrl || ""
          };
          const exists = favorites.some(f => f.spotifyId === id);
          let updated = [...favorites];
          if (!exists) {
            updated = [{ id: `fav_${Date.now()}`, ...trackData, createdAt: new Date() }, ...favorites];
          }
          const updatedFavs = updated.map(f => {
            if (f.spotifyId === id) {
              return { ...f, instagramAudioUrl: playUrl, instagramVideoUrl: videoUrl };
            }
            return f;
          });
          saveLocalFavorites(updatedFavs);
        } else if (type === "collection" && collectionId) {
          const updatedColls = collections.map(c => {
            if (c.id === collectionId) {
              return {
                ...c,
                tracks: c.tracks.map(t => {
                  if (t.spotifyId === id) {
                    return { ...t, instagramAudioUrl: playUrl, instagramVideoUrl: videoUrl };
                  }
                  return t;
                })
               };
            }
            return c;
          });
          saveLocalCollections(updatedColls);
        }
      } else {
        if (type === "favorite" || type === "discover") {
          let favRecord = favorites.find(f => f.spotifyId === id);
          if (!favRecord) {
            const trackData = {
              spotifyId: id,
              title: track.title || "",
              artist: track.artist || "",
              albumArt: track.albumArt || "",
              previewUrl: track.previewUrl || ""
            };
            const res = await toggleFavorite(session.user.id, trackData);
            if (res.success) {
              const dbFavorites = await getFavorites(session.user.id);
              favRecord = dbFavorites.find(f => f.spotifyId === id);
            }
          }
          if (favRecord) {
            await saveInstagramAudioToFavorite(favRecord.id, videoUrl, playUrl);
          }
        } else if (type === "collection") {
          const coll = collections.find(c => c.id === collectionId);
          const trackRecord = coll?.tracks.find(t => t.spotifyId === id);
          if (trackRecord) {
            await saveInstagramAudioToTrack(trackRecord.id, videoUrl, playUrl);
          }
        }
        await loadUserData();
      }

      // 3. Eğer şu an çalınan şarkı buysa, oynatıcıyı yeni ses ile güncelle
      if (currentTrack?.id === id) {
        const updatedTrack = {
          ...currentTrack,
          instagramAudioUrl: playUrl,
          instagramVideoUrl: videoUrl
        };
        setCurrentTrack(updatedTrack);
        if (isPlaying && audioRef.current && audioSourceMode === "instagram") {
          audioRef.current.src = playUrl;
          audioRef.current.load();
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      console.error("Otomatik Instagram Reels çözme hatası:", err);
    } finally {
      setResolvingInstagramTrackId(null);
    }
  };

  // Viral Rulet Çevirme Eylemi
  const handleSpinRoulette = async () => {
    if (spinning) return;
    
    setSpinning(true);
    setRouletteTrack(null);
    setRouletteError("");
    setResolvingRouletteTikTok(false);
    
    // Oynatıcıyı durdur
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    try {
      // 1. TRENDING_HITS listesinden rastgele bir şarkı seç
      const randomIndex = Math.floor(Math.random() * TRENDING_HITS.length);
      const chosen = TRENDING_HITS[randomIndex];
      
      console.log(`[Viral Rulet] Çevriliyor... Seçilen Hedef: ${chosen.artist} - ${chosen.title}`);
      
      // 2. Arka planda Spotify/iTunes üzerinden gerçek metadata bilgilerini ara
      const searchResults = await searchTracks(`${chosen.artist} ${chosen.title}`);
      
      // En az 2.2 saniye dönme efekti hissi yaratmak için yapay gecikme
      await new Promise(resolve => setTimeout(resolve, 2200));
      
      if (!searchResults || searchResults.length === 0) {
        setRouletteError("Müzik kütüphanesinden şarkı bilgileri yüklenemedi. Lütfen tekrar çevirmeyi deneyin.");
        setSpinning(false);
        return;
      }
      
      const matchedTrack = searchResults[0];
      setRouletteTrack(matchedTrack);
      
      // 3. Arka planda TikTok ses linkini otomatik çözmeyi dene (Kullanıcıya mükemmel deneyim için!)
      setResolvingRouletteTikTok(true);
      
      const resolved = await autoResolveTikTokAudio(matchedTrack.title, matchedTrack.artist);
      
      if (resolved && resolved.playUrl) {
        const finalTrack: SpotifyTrack = {
          ...matchedTrack,
          customPreviewUrl: resolved.playUrl,
          tiktokVideoUrl: resolved.videoUrl
        };
        
        // UI cache'e kaydet
        setResolvedCache(prev => ({
          ...prev,
          [matchedTrack.id]: {
            ...prev[matchedTrack.id],
            customPreviewUrl: resolved.playUrl,
            tiktokVideoUrl: resolved.videoUrl
          }
        }));
        
        setRouletteTrack(finalTrack);
        playTrack(finalTrack, "spotify");
      } else {
        // TikTok bulunamazsa varsayılan önizleme (Spotify/iTunes) sesini çal
        playTrack(matchedTrack, "spotify");
      }
    } catch (err: any) {
      console.error("Viral Rulet hatası:", err);
      setRouletteError("Beklenmedik bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setSpinning(false);
      setResolvingRouletteTikTok(false);
    }
  };

  // Saniye Cinsinden Süreyi Dakika:Saniye Formatına Dönüştürme
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // Arayüzün ihtiyaç duyduğu tüm değişkenleri dışa aktarıyoruz
  return {
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
    setSearchResults,
    favorites,
    resolvedCache,
    currentTrack,
    isPlaying,
    playTrack,
    handleAutoResolveTikTok,
    resolvingTrackId,
    resolvingStudioTrackId,
    handleAutoResolveInstagram,
    resolvingInstagramTrackId,
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
    handleProgressBarClick
  };
}
