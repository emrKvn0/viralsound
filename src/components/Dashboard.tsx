"use client";

import React, { useState, useEffect, useRef } from "react";
import { signIn, signOut } from "next-auth/react";
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
  Info
} from "lucide-react";
import Button from "./ui/button";
import Input from "./ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import Dialog from "./ui/dialog";
import {
  searchTracks,
  SpotifyTrack
} from "@/app/actions/spotify";
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
  saveInstagramAudioToTrack
} from "@/app/actions/database";
import { extractTikTokAudio, autoResolveTikTokAudio, autoResolveInstagramAudio } from "@/app/actions/tiktok";

// TikTok Logosu SVG Bileşeni
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.62 4.2 1.22 1.34 2.92 2.16 4.74 2.37v3.9c-1.74-.01-3.44-.45-4.94-1.32-.23-.13-.45-.28-.66-.44v6.86c.01 2.3-.9 4.54-2.54 6.16-1.64 1.63-3.9 2.53-6.22 2.53-2.31 0-4.56-.89-6.2-2.52-1.65-1.63-2.57-3.87-2.57-6.19 0-2.31.91-4.55 2.55-6.18 1.63-1.63 3.88-2.54 6.19-2.54 1.11-.01 2.21.2 3.23.62.01 1.48.01 2.96.01 4.44-.73-.42-1.57-.65-2.43-.65-1.22 0-2.38.48-3.24 1.34-.87.87-1.35 2.03-1.35 3.25 0 1.23.48 2.39 1.35 3.26.86.86 2.02 1.35 3.25 1.35 1.22 0 2.38-.48 3.25-1.35.87-.87 1.35-2.03 1.35-3.26V.02z"/>
  </svg>
);

// Instagram Logosu SVG Bileşeni
const InstagramIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

interface DashboardProps {
  initialSession: any;
}

export default function Dashboard({ initialSession }: DashboardProps) {
  // --- STATE ---
  const [session, setSession] = useState(initialSession);
  const [activeTab, setActiveTab] = useState<"discover" | "collections" | "favorites">("discover");
  const [searchQuery, setSearchQuery] = useState("");
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Son aramalar geçmişi
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vsh_recent_searches");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  // Veritabanı ve Yerel Depolama (Fallback) State'leri
  const [collections, setCollections] = useState<DBCollection[]>([]);
  const [favorites, setFavorites] = useState<DBFavorite[]>([]);
  const [isLocalMode, setIsLocalMode] = useState(false);
  const [dbNoticeShown, setDbNoticeShown] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("vsh_hide_db_notice");
      return saved !== "true";
    }
    return true;
  });

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

  // Ses seviyesini güncelleme
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Ses Oynatıcı Kontrolleri
  const playTrack = (track: SpotifyTrack, sourceMode?: "spotify" | "tiktok" | "instagram") => {
    if (!audioRef.current) return;

    // Hangi ses kaynağını çalacağımızı belirliyoruz
    const targetSourceMode = sourceMode || 
      (track.instagramAudioUrl ? "instagram" : 
      (track.customPreviewUrl ? "tiktok" : "spotify"));
    
    setAudioSourceMode(targetSourceMode);

    let audioSource = track.previewUrl;
    if (targetSourceMode === "tiktok" && track.customPreviewUrl) {
      audioSource = track.customPreviewUrl;
    } else if (targetSourceMode === "instagram" && track.instagramAudioUrl) {
      audioSource = track.instagramAudioUrl;
    }

    if (currentTrack?.id === track.id && (!sourceMode || sourceMode === audioSourceMode)) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlaying(true);
      }
    } else {
      audioRef.current.src = audioSource;
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
    
    // 1. Koleksiyonları çek
    const dbCollections = await getCollections(session.user.id);
    // 2. Favorileri çek
    const dbFavorites = await getFavorites(session.user.id);

    // Eğer Neon veritabanı bağlantısı yoksa, getCollections [] döndürür.
    // O zaman yerel depolama (LocalStorage) fallback'ini etkinleştir.
    const hasDb = process.env.NEXT_PUBLIC_DB_CONNECTED === "true" || dbCollections.length > 0 || dbFavorites.length > 0;
    
    // Veritabanı sorgulamalarını yerel bellekle de doğrula
    if (dbCollections.length === 0 && dbFavorites.length === 0) {
      // LocalStorage'tan verileri çek
      const localColls = localStorage.getItem(`vsh_colls_${session.user.id}`);
      const localFavs = localStorage.getItem(`vsh_favs_${session.user.id}`);
      
      if (localColls) {
        setCollections(JSON.parse(localColls));
      } else {
        setCollections([]);
      }

      if (localFavs) {
        setFavorites(JSON.parse(localFavs));
      } else {
        setFavorites([]);
      }
      setIsLocalMode(true);
    } else {
      setCollections(dbCollections);
      setFavorites(dbFavorites);
      setIsLocalMode(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, [session]);

  // Arama İşlemi (Canlı Arama & Debounce)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setLoading(true);
      searchTracks(searchQuery).then((res) => {
        setTracks(res);
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
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

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

    if (isLocalMode) {
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
    if (isLocalMode) {
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

    if (isLocalMode) {
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
    if (isLocalMode) {
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

    if (isLocalMode) {
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

        if (isLocalMode) {
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

        if (isLocalMode) {
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

      // 2. Veritabanına veya LocalStorage'a kaydet
      if (isLocalMode) {
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

      // 2. Veritabanına veya LocalStorage'a kaydet
      if (isLocalMode) {
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

  // Saniye Cinsinden Süreyi Dakika:Saniye Formatına Dönüştürme
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col pb-32">
      {/* --- ÜST BAR (NAVBAR) --- */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-white/5 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-[#ff0050] to-[#a855f7] flex items-center justify-center animate-pulse-glow">
            <Music className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              ViralSound <span className="text-xs bg-gradient-to-r from-primary to-cyan-glow text-transparent bg-clip-text font-extrabold uppercase">Hub</span>
            </h1>
            <p className="text-[10px] text-gray-400">15-30s Hit Preview Aggregator</p>
          </div>
        </div>

        {/* Sekme Değiştirici */}
        <nav className="hidden md:flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab("discover")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
              activeTab === "discover"
                ? "bg-primary text-white font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <Compass className="h-4 w-4" /> Keşfet
          </button>
          <button
            onClick={() => {
              if (!session) setIsLoginOpen(true);
              else setActiveTab("collections");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
              activeTab === "collections"
                ? "bg-primary text-white font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <ListPlus className="h-4 w-4" /> Koleksiyonlarım
          </button>
          <button
            onClick={() => {
              if (!session) setIsLoginOpen(true);
              else setActiveTab("favorites");
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-300 ${
              activeTab === "favorites"
                ? "bg-primary text-white font-medium"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <FolderHeart className="h-4 w-4" /> Favorilerim
          </button>
        </nav>

        {/* Kullanıcı Giriş Paneli */}
        <div>
          {session ? (
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-sm font-semibold text-white">{session.user.name}</span>
                <span className="text-[10px] text-gray-400">{session.user.email}</span>
              </div>
              <div className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-primary">
                <User className="h-4 w-4" />
              </div>
              <Button variant="ghost" size="icon" onClick={handleSignOut} className="h-9 w-9 text-gray-400 hover:text-red-500">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              onClick={() => setIsLoginOpen(true)}
              className="flex items-center gap-2"
            >
              <LogIn className="h-4 w-4" /> Giriş Yap
            </Button>
          )}
        </div>
      </header>

      {/* Mobilde Alt Sekme Menüsü */}
      <div className="md:hidden fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-[#0a0915]/90 border border-white/10 px-3 py-2 rounded-2xl backdrop-blur-lg flex items-center gap-1 shadow-2xl">
        <button
          onClick={() => setActiveTab("discover")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
            activeTab === "discover" ? "bg-primary text-white" : "text-gray-400"
          }`}
        >
          <Compass className="h-3.5 w-3.5" /> Keşfet
        </button>
        <button
          onClick={() => {
            if (!session) setIsLoginOpen(true);
            else setActiveTab("collections");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
            activeTab === "collections" ? "bg-primary text-white" : "text-gray-400"
          }`}
        >
          <ListPlus className="h-3.5 w-3.5" /> Koleksiyonlar
        </button>
        <button
          onClick={() => {
            if (!session) setIsLoginOpen(true);
            else setActiveTab("favorites");
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold ${
            activeTab === "favorites" ? "bg-primary text-white" : "text-gray-400"
          }`}
        >
          <FolderHeart className="h-3.5 w-3.5" /> Favoriler
        </button>
      </div>

      {/* --- ANA BÖLÜM --- */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Neon Bilgi Bannerı (Yerel Mod Fallback Bildirimi) */}
        {isLocalMode && dbNoticeShown && (
          <div className="relative glass-panel rounded-2xl p-4 bg-purple-500/10 border-purple-500/20 text-gray-200 text-sm flex items-center justify-between animate-float">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-primary shrink-0">
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
          <div className="flex flex-col gap-6">
            {/* Kahraman Alanı (Hero Section) */}
            <div className="relative glass-panel rounded-3xl p-8 lg:p-12 overflow-hidden border border-white/10 flex flex-col items-center text-center lg:text-left lg:items-start lg:justify-between gap-6">
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-primary/20 via-cyan-glow/10 to-transparent rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-spotify/15 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-2xl relative z-10 flex flex-col gap-3">
                <span className="self-center lg:self-start text-xs font-extrabold tracking-widest text-primary uppercase bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                  En Viral Şarkı Kesitleri
                </span>
                <h2 className="text-3xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                  Tiktok Trendlerini <br className="hidden md:inline" />
                  <span className="bg-gradient-to-r from-primary via-cyan-glow to-spotify text-transparent bg-clip-text">Spotify Kalitesiyle</span> Dinleyin
                </h2>
                <p className="text-sm lg:text-base text-gray-400 leading-relaxed mt-2">
                  TikTok üzerinde viral olan 15-30 saniyelik en can alıcı şarkı nakaratlarını Spotify yüksek ses kalitesiyle anında dinleyin, kaydedin ve orijinal TikTok ses sayfalarına tek tıkla ulaşın.
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

            {/* Arama Sonuçları */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {searchQuery ? `"${searchQuery}" İçin Arama Sonuçları` : "Günün Trend Şarkıları"}
                </h3>
                <span className="text-xs text-gray-400">{tracks.length} Sonuç Listelendi</span>
              </div>

              {loading && tracks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                  <p className="text-sm">Spotify müzikleri yükleniyor...</p>
                </div>
              ) : tracks.length === 0 ? (
                <div className="glass-panel rounded-2xl py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                  <Music className="h-12 w-12 text-gray-500" />
                  <p className="text-sm font-semibold">Aradığınız kriterde şarkı bulunamadı.</p>
                  <p className="text-xs text-gray-500">Lütfen farklı bir şarkı veya sanatçı aramayı deneyin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tracks.map((track) => {
                    const favRecord = favorites.find(f => f.spotifyId === track.id);
                    const hasCustomTikTok = !!favRecord?.customPreviewUrl;
                    const hasCustomInstagram = !!favRecord?.instagramAudioUrl;
                    
                    const playbackTrack = { 
                      ...track, 
                      customPreviewUrl: favRecord?.customPreviewUrl || undefined, 
                      tiktokVideoUrl: favRecord?.tiktokVideoUrl || undefined,
                      instagramAudioUrl: favRecord?.instagramAudioUrl || undefined,
                      instagramVideoUrl: favRecord?.instagramVideoUrl || undefined
                    };

                    const active = currentTrack?.id === track.id;
                    const playing = active && isPlaying;

                    return (
                      <Card key={track.id} className="relative overflow-hidden group">
                        <div className="flex items-center gap-4">
                          {/* Albüm Resmi ve Play Buton Hover */}
                          <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform duration-300">
                            <img
                               src={track.albumArt}
                               alt={track.title}
                               className="h-full w-full object-cover"
                             />
                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                              <button
                                onClick={() => playTrack(playbackTrack)}
                                className="h-9 w-9 bg-primary text-white rounded-full flex items-center justify-center active:scale-90 transition-transform"
                              >
                                {playing ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white translate-x-[1px]" />}
                              </button>
                            </div>
                            {/* Oynatılıyor Dalga Animasyonu */}
                            {playing && (
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-[3px]">
                                <span className="w-[3px] bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s" }} />
                                <span className="w-[3px] bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.3s" }} />
                                <span className="w-[3px] bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.5s" }} />
                              </div>
                            )}
                          </div>
 
                          {/* Şarkı Bilgileri */}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">
                              {track.title}
                            </h4>
                            <p className="text-xs text-gray-400 truncate">{track.artist}</p>
                          </div>
 
                          {/* Butonlar */}
                          <div className="flex items-center gap-1.5">
                            {/* TikTok Sesi Çöz Butonu (Göz Alıcı Özel Tasarım) */}
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
                              className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border ${
                                resolvingTrackId === track.id
                                  ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                                  : hasCustomTikTok 
                                    ? "bg-[#ff0050]/15 border-[#ff0050]/40 text-[#ff0050] shadow-[0_0_15px_rgba(255,0,80,0.3)] animate-pulse-glow hover:border-[#00f2fe]" 
                                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#ff0050]/50 hover:bg-[#ff0050]/10"
                              }`}
                              title={hasCustomTikTok ? "TikTok Sesi Aktif! Otomatik güncellemek için tıklayın." : "TikTok Viral Sesi Otomatik Entegre Et"}
                            >
                              {resolvingTrackId === track.id ? (
                                <Loader2 className="h-4.5 w-4.5 text-[#ff0050] animate-spin" />
                              ) : (
                                <>
                                  {hasCustomTikTok && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f2fe]"></span>
                                    </span>
                                  )}
                                  <TikTokIcon className={`h-4.5 w-4.5 ${hasCustomTikTok ? "animate-pulse" : ""}`} />
                                </>
                              )}
                            </Button>

                            {/* Instagram Sesi Çöz Butonu (Göz Alıcı Mor Tasarım) */}
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
                              className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border ${
                                resolvingInstagramTrackId === track.id
                                  ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                                  : hasCustomInstagram 
                                    ? "bg-gradient-to-tr from-[#833ab4]/15 via-[#fd1d1d]/15 to-[#fcb045]/15 border-[#833ab4]/50 text-[#fd1d1d] shadow-[0_0_15px_rgba(131,58,180,0.3)] animate-pulse-glow hover:border-[#fcb045]" 
                                    : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#833ab4]/50 hover:bg-[#833ab4]/10"
                              }`}
                              title={hasCustomInstagram ? "Instagram Reels Sesi Aktif! Otomatik güncellemek için tıklayın." : "Instagram Reels Sesi Otomatik Entegre Et"}
                            >
                              {resolvingInstagramTrackId === track.id ? (
                                <Loader2 className="h-4.5 w-4.5 text-[#fd1d1d] animate-spin" />
                              ) : (
                                <>
                                  {hasCustomInstagram && (
                                    <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcb045] opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcb045]"></span>
                                    </span>
                                  )}
                                  <InstagramIcon className={`h-4.5 w-4.5 ${hasCustomInstagram ? "animate-pulse" : ""}`} />
                                </>
                              )}
                            </Button>

                            {/* Favori */}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleFavorite(playbackTrack)}
                              className={`h-8 w-8 hover:bg-white/5 ${
                                isFavorite(track.id) ? "text-red-500" : "text-gray-400"
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
                              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/5"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- 2. KOLEKSİYONLARIM (COLLECTIONS) SEKME İÇERİĞİ --- */}
        {activeTab === "collections" && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Özel Müzik Koleksiyonlarım</h3>
                <p className="text-xs text-gray-400 mt-1">İçerik üreteceğiniz, videolarınızda kullanacağınız şarkı grupları oluşturun</p>
              </div>
              <Button
                variant="primary"
                onClick={() => setIsCreateCollectionOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Yeni Koleksiyon
              </Button>
            </div>

            {collections.length === 0 ? (
              <div className="glass-panel rounded-2xl py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-4">
                <ListPlus className="h-14 w-14 text-gray-500" />
                <div>
                  <p className="text-sm font-semibold">Henüz müzik koleksiyonu oluşturmadınız.</p>
                  <p className="text-xs text-gray-500 mt-1">Yeni bir koleksiyon ekleyerek beğendiğiniz trend şarkıları gruplamaya başlayın.</p>
                </div>
                <Button variant="secondary" onClick={() => setIsCreateCollectionOpen(true)}>
                  İlk Koleksiyonumu Oluştur
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {collections.map((coll) => (
                  <Card key={coll.id} className="relative group overflow-hidden border border-white/5" hoverEffect={false}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
                    
                    {/* Koleksiyon Üst Bilgi */}
                    <div className="flex items-start justify-between pb-4 border-b border-white/5 mb-4">
                      <div>
                        <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">
                          {coll.name}
                        </h4>
                        {coll.description && (
                          <p className="text-xs text-gray-400 mt-1">{coll.description}</p>
                        )}
                        <span className="text-[10px] text-gray-500 mt-2 block">
                          {coll.tracks.length} Şarkı Kayıtlı
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteCollection(coll.id)}
                        className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-white/5"
                      >
                        <Trash2 className="h-4.5 w-4.5" />
                      </Button>
                    </div>

                    {/* Şarkı Listesi */}
                    {coll.tracks.length === 0 ? (
                      <p className="text-xs text-gray-500 py-4 italic text-center">
                        Bu koleksiyon henüz boş. Keşfet sekmesinden şarkı ekleyin!
                      </p>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {coll.tracks.map((t) => {
                          const active = currentTrack?.id === t.spotifyId;
                          const playing = active && isPlaying;

                        // SpotifyTrack'e dönüştür
                          const formatTrack: SpotifyTrack = {
                            id: t.spotifyId,
                            title: t.title,
                            artist: t.artist,
                            albumArt: t.albumArt || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop",
                            previewUrl: t.previewUrl,
                            customPreviewUrl: t.customPreviewUrl || undefined,
                            tiktokVideoUrl: t.tiktokVideoUrl || undefined,
                            instagramAudioUrl: (t as any).instagramAudioUrl || undefined,
                            instagramVideoUrl: (t as any).instagramVideoUrl || undefined,
                            tiktokUrl: `https://www.google.com/search?q=site:tiktok.com/music+${encodeURIComponent(`${t.artist} - ${t.title}`)}&btnI=I`
                          };

                          return (
                            <div
                              key={t.id}
                              className="flex items-center gap-3 bg-white/3 hover:bg-white/5 p-2 rounded-xl border border-white/3 group/item transition-colors"
                            >
                              {/* Şarkı Çal Buton */}
                              <button
                                onClick={() => playTrack(formatTrack)}
                                className="h-8 w-8 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-primary hover:border-primary active:scale-90 transition-all shrink-0"
                              >
                                {playing ? <Pause className="h-3 w-3 fill-white" /> : <Play className="h-3 w-3 fill-white translate-x-[0.5px]" />}
                              </button>

                              <img
                                src={formatTrack.albumArt}
                                alt={t.title}
                                className="h-9 w-9 rounded-lg object-cover shrink-0"
                              />

                              <div className="flex-1 min-w-0">
                                <h5 className="font-bold text-white text-xs truncate">
                                  {t.title}
                                </h5>
                                <p className="text-[10px] text-gray-400 truncate">{t.artist}</p>
                              </div>

                              {/* İşlemler */}
                              <div className="flex items-center gap-1">
                                {/* TikTok Ses Çözücü Butonu */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    handleAutoResolveTikTok({
                                      id: t.spotifyId,
                                      title: t.title,
                                      artist: t.artist,
                                      type: "collection",
                                      collectionId: coll.id,
                                      albumArt: formatTrack.albumArt,
                                      previewUrl: formatTrack.previewUrl
                                    });
                                  }}
                                  disabled={resolvingTrackId === t.spotifyId}
                                  className={`h-8.5 w-8.5 rounded-xl transition-all duration-300 relative overflow-hidden border ${
                                    resolvingTrackId === t.spotifyId
                                      ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                                      : t.customPreviewUrl 
                                        ? "bg-[#ff0050]/15 border-[#ff0050]/40 text-[#ff0050] shadow-[0_0_12px_rgba(255,0,80,0.3)] animate-pulse-glow hover:border-[#00f2fe]" 
                                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#ff0050]/50 hover:bg-[#ff0050]/10"
                                  }`}
                                  title={t.customPreviewUrl ? "TikTok Sesi Aktif! Otomatik güncellemek için tıklayın." : "TikTok Viral Sesi Otomatik Entegre Et"}
                                >
                                  {resolvingTrackId === t.spotifyId ? (
                                    <Loader2 className="h-4 w-4 text-[#ff0050] animate-spin" />
                                  ) : (
                                    <>
                                      {t.customPreviewUrl && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#00f2fe]"></span>
                                        </span>
                                      )}
                                      <TikTokIcon className={`h-4 w-4 ${t.customPreviewUrl ? "animate-pulse" : ""}`} />
                                    </>
                                  )}
                                </Button>

                                {/* Instagram Reels Ses Çözücü Butonu */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    handleAutoResolveInstagram({
                                      id: t.spotifyId,
                                      title: t.title,
                                      artist: t.artist,
                                      type: "collection",
                                      collectionId: coll.id,
                                      albumArt: formatTrack.albumArt,
                                      previewUrl: formatTrack.previewUrl
                                    });
                                  }}
                                  disabled={resolvingInstagramTrackId === t.spotifyId}
                                  className={`h-8.5 w-8.5 rounded-xl transition-all duration-300 relative overflow-hidden border ${
                                    resolvingInstagramTrackId === t.spotifyId
                                      ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                                      : (t as any).instagramAudioUrl 
                                        ? "bg-gradient-to-tr from-[#833ab4]/15 via-[#fd1d1d]/15 to-[#fcb045]/15 border-[#833ab4]/50 text-[#fd1d1d] shadow-[0_0_12px_rgba(131,58,180,0.3)] animate-pulse-glow hover:border-[#fcb045]" 
                                        : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#833ab4]/50 hover:bg-[#833ab4]/10"
                                  }`}
                                  title={(t as any).instagramAudioUrl ? "Instagram Reels Sesi Aktif! Otomatik güncellemek için tıklayın." : "Instagram Reels Sesi Otomatik Entegre Et"}
                                >
                                  {resolvingInstagramTrackId === t.spotifyId ? (
                                    <Loader2 className="h-4 w-4 text-[#fd1d1d] animate-spin" />
                                  ) : (
                                    <>
                                      {(t as any).instagramAudioUrl && (
                                        <span className="absolute -top-0.5 -right-0.5 flex h-1.5 w-1.5">
                                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcb045] opacity-75"></span>
                                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#fcb045]"></span>
                                        </span>
                                      )}
                                      <InstagramIcon className={`h-4 w-4 ${(t as any).instagramAudioUrl ? "animate-pulse" : ""}`} />
                                    </>
                                  )}
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleToggleFavorite(formatTrack)}
                                  className={`h-8 w-8 ${
                                    isFavorite(t.spotifyId) ? "text-red-500" : "text-gray-400"
                                  }`}
                                >
                                  <Heart className="h-3.5 w-3.5" fill={isFavorite(t.spotifyId) ? "currentColor" : "none"} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemoveTrackFromCollection(coll.id, t.spotifyId)}
                                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* --- 3. FAVORİLERİM (FAVORITES) SEKME İÇERİĞİ --- */}
        {activeTab === "favorites" && (
          <div className="flex flex-col gap-6">
            <div>
              <h3 className="text-xl font-bold text-white">Favori Şarkı Nakaratlarım</h3>
              <p className="text-xs text-gray-400 mt-1">Hızlıca erişmek ve dinlemek istediğiniz en viral hit kesitleri</p>
            </div>

            {favorites.length === 0 ? (
              <div className="glass-panel rounded-2xl py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-4">
                <Heart className="h-14 w-14 text-gray-500" />
                <div>
                  <p className="text-sm font-semibold">Henüz favori şarkınız yok.</p>
                  <p className="text-xs text-gray-500 mt-1">Keşfet sayfasındaki şarkıların yanındaki kalp ikonuna tıklayarak favorilerinize ekleyebilirsiniz.</p>
                </div>
                <Button variant="secondary" onClick={() => setActiveTab("discover")}>
                  Şarkı Arayın
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map((fav) => {
                  const formatTrack: SpotifyTrack = {
                    id: fav.spotifyId,
                    title: fav.title,
                    artist: fav.artist,
                    albumArt: fav.albumArt || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop",
                    previewUrl: fav.previewUrl,
                    customPreviewUrl: fav.customPreviewUrl || undefined,
                    tiktokVideoUrl: fav.tiktokVideoUrl || undefined,
                    instagramAudioUrl: (fav as any).instagramAudioUrl || undefined,
                    instagramVideoUrl: (fav as any).instagramVideoUrl || undefined,
                    tiktokUrl: `https://www.google.com/search?q=site:tiktok.com/music+${encodeURIComponent(`${fav.artist} - ${fav.title}`)}&btnI=I`
                  };

                  const active = currentTrack?.id === fav.spotifyId;
                  const playing = active && isPlaying;

                  return (
                    <Card key={fav.id} className="relative overflow-hidden group">
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 rounded-xl overflow-hidden shrink-0">
                          <img
                            src={formatTrack.albumArt}
                            alt={fav.title}
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <button
                              onClick={() => playTrack(formatTrack)}
                              className="h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center"
                            >
                              {playing ? <Pause className="h-3.5 w-3.5 fill-white" /> : <Play className="h-3.5 w-3.5 fill-white translate-x-[0.5px]" />}
                            </button>
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-white text-sm truncate group-hover:text-primary transition-colors">
                            {fav.title}
                          </h4>
                          <p className="text-xs text-gray-400 truncate">{fav.artist}</p>
                        </div>

                        <div className="flex items-center gap-1">
                          {/* TikTok Ses Çözücü Butonu */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleAutoResolveTikTok({
                                id: fav.spotifyId,
                                title: fav.title,
                                artist: fav.artist,
                                type: "favorite",
                                albumArt: formatTrack.albumArt,
                                previewUrl: formatTrack.previewUrl
                              });
                            }}
                            disabled={resolvingTrackId === fav.spotifyId}
                            className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border ${
                              resolvingTrackId === fav.spotifyId
                                ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                                : fav.customPreviewUrl 
                                  ? "bg-[#ff0050]/15 border-[#ff0050]/40 text-[#ff0050] shadow-[0_0_15px_rgba(255,0,80,0.3)] animate-pulse-glow hover:border-[#00f2fe]" 
                                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#ff0050]/50 hover:bg-[#ff0050]/10"
                            }`}
                            title={fav.customPreviewUrl ? "TikTok Sesi Aktif! Otomatik güncellemek için tıklayın." : "TikTok Viral Sesi Otomatik Entegre Et"}
                          >
                            {resolvingTrackId === fav.spotifyId ? (
                              <Loader2 className="h-4.5 w-4.5 text-[#ff0050] animate-spin" />
                            ) : (
                              <>
                                {fav.customPreviewUrl && (
                                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00f2fe]"></span>
                                  </span>
                                )}
                                <TikTokIcon className={`h-4.5 w-4.5 ${fav.customPreviewUrl ? "animate-pulse" : ""}`} />
                              </>
                            )}
                          </Button>

                          {/* Instagram Reels Ses Çözücü Butonu */}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              handleAutoResolveInstagram({
                                id: fav.spotifyId,
                                title: fav.title,
                                artist: fav.artist,
                                type: "favorite",
                                albumArt: formatTrack.albumArt,
                                previewUrl: formatTrack.previewUrl
                              });
                            }}
                            disabled={resolvingInstagramTrackId === fav.spotifyId}
                            className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border ${
                              resolvingInstagramTrackId === fav.spotifyId
                                ? "bg-white/5 border-white/10 text-gray-500 cursor-not-allowed"
                                : (fav as any).instagramAudioUrl 
                                  ? "bg-gradient-to-tr from-[#833ab4]/15 via-[#fd1d1d]/15 to-[#fcb045]/15 border-[#833ab4]/50 text-[#fd1d1d] shadow-[0_0_15px_rgba(131,58,180,0.3)] animate-pulse-glow hover:border-[#fcb045]" 
                                  : "bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-[#833ab4]/50 hover:bg-[#833ab4]/10"
                            }`}
                            title={(fav as any).instagramAudioUrl ? "Instagram Reels Sesi Aktif! Otomatik güncellemek için tıklayın." : "Instagram Reels Sesi Otomatik Entegre Et"}
                          >
                            {resolvingInstagramTrackId === fav.spotifyId ? (
                              <Loader2 className="h-4.5 w-4.5 text-[#fd1d1d] animate-spin" />
                            ) : (
                              <>
                                {(fav as any).instagramAudioUrl && (
                                  <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#fcb045] opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#fcb045]"></span>
                                  </span>
                                )}
                                <InstagramIcon className={`h-4.5 w-4.5 ${(fav as any).instagramAudioUrl ? "animate-pulse" : ""}`} />
                              </>
                            )}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleFavorite(formatTrack)}
                            className="h-8 w-8 text-red-500 hover:bg-white/5"
                          >
                            <Heart className="h-4 w-4" fill="currentColor" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* --- SABİT MODERN SES OYNATICI (BOTTOM AUDIO PLAYER) --- */}
      {currentTrack && (
        <div className="fixed bottom-0 inset-x-0 z-50 glass-panel border-t border-white/10 bg-[#06050b]/95 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_-15px_40px_rgba(0,0,0,0.7)]">
          {/* Sol: Şarkı Ayrıntıları */}
          <div className="w-full md:w-1/4 flex items-center gap-4">
            <div className="relative h-14 w-14 rounded-xl overflow-hidden shadow-2xl shrink-0 group border border-white/10">
              <img
                src={currentTrack.albumArt}
                alt={currentTrack.title}
                className={`h-full w-full object-cover rounded-xl ${
                  isPlaying ? "animate-[spin_10s_linear_infinite]" : ""
                }`}
              />
              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                <Music className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h4 className="font-extrabold text-white text-sm truncate select-none">
                  {currentTrack.title}
                </h4>
                {audioSourceMode === "tiktok" && (
                  <span className="shrink-0 px-2 py-0.5 text-[9px] font-black rounded-full bg-gradient-to-r from-[#ff0050] to-[#00f2fe] text-white animate-pulse shadow-[0_0_8px_rgba(0,242,254,0.5)]">
                    TIKTOK HIT 🔥
                  </span>
                )}
                {audioSourceMode === "instagram" && (
                  <span className="shrink-0 px-2 py-0.5 text-[9px] font-black rounded-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white animate-pulse shadow-[0_0_8px_rgba(253,29,29,0.5)]">
                    REELS HIT ⚡
                  </span>
                )}
                {audioSourceMode === "spotify" && (
                  <span className="shrink-0 px-2 py-0.5 text-[9px] font-black rounded-full bg-[#1DB954] text-white shadow-[0_0_8px_rgba(29,185,84,0.5)]">
                    SPOTIFY
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate select-none">{currentTrack.artist}</p>
            </div>
          </div>

          {/* Orta: Çalma Kontrolleri & İlerleme */}
          <div className="w-full md:w-2/4 flex flex-col items-center gap-1.5">
            {/* Ses Kaynağı Seçici Panel */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 p-0.5 rounded-full mb-1">
              <button
                onClick={() => playTrack(currentTrack, "spotify")}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${
                  audioSourceMode === "spotify"
                    ? "bg-[#1DB954] text-white shadow-[0_0_10px_rgba(29,185,84,0.4)]"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> Spotify
              </button>
              
              <button
                onClick={() => {
                  if (currentTrack.customPreviewUrl) {
                    playTrack(currentTrack, "tiktok");
                  } else {
                    handleAutoResolveTikTok({
                      id: currentTrack.id,
                      title: currentTrack.title,
                      artist: currentTrack.artist,
                      type: activeTab === "discover" ? "discover" : activeTab === "favorites" ? "favorite" : "collection",
                      albumArt: currentTrack.albumArt,
                      previewUrl: currentTrack.previewUrl
                    });
                  }
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${
                  audioSourceMode === "tiktok"
                    ? "bg-[#ff0050] text-white shadow-[0_0_10px_rgba(255,0,80,0.4)]"
                    : currentTrack.customPreviewUrl
                      ? "text-[#ff0050]/80 hover:text-white hover:bg-[#ff0050]/10"
                      : "text-gray-500 hover:text-gray-300"
                }`}
                title={currentTrack.customPreviewUrl ? "TikTok Viralini Çal" : "TikTok Viralini Otomatik Çöz ve Çal"}
              >
                <TikTokIcon className="h-3 w-3 shrink-0" />
                {currentTrack.customPreviewUrl ? "TikTok Hit" : "Çöz (TikTok)"}
              </button>

              <button
                onClick={() => {
                  if (currentTrack.instagramAudioUrl) {
                    playTrack(currentTrack, "instagram");
                  } else {
                    handleAutoResolveInstagram({
                      id: currentTrack.id,
                      title: currentTrack.title,
                      artist: currentTrack.artist,
                      type: activeTab === "discover" ? "discover" : activeTab === "favorites" ? "favorite" : "collection",
                      albumArt: currentTrack.albumArt,
                      previewUrl: currentTrack.previewUrl
                    });
                  }
                }}
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 ${
                  audioSourceMode === "instagram"
                    ? "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-[0_0_10px_rgba(253,29,29,0.4)]"
                    : currentTrack.instagramAudioUrl
                      ? "text-[#fd1d1d]/80 hover:text-white hover:bg-[#833ab4]/10"
                      : "text-gray-500 hover:text-gray-300"
                }`}
                title={currentTrack.instagramAudioUrl ? "Instagram Reels Sesini Çal" : "Instagram Reels Sesini Otomatik Çöz ve Çal"}
              >
                <InstagramIcon className="h-3 w-3 shrink-0" />
                {currentTrack.instagramAudioUrl ? "Reels Hit" : "Çöz (Reels)"}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => playTrack(currentTrack)}
                className="h-11 w-11 bg-primary text-white rounded-full flex items-center justify-center active:scale-95 transition-all animate-pulse-glow"
              >
                {isPlaying ? <Pause className="h-5 w-5 fill-white" /> : <Play className="h-5 w-5 fill-white translate-x-[1px]" />}
              </button>

              {/* Dans Eden Dalga Animasyonu */}
              {isPlaying && (
                <div className="hidden lg:flex items-center gap-[4px] h-6 px-3 bg-white/5 border border-white/10 rounded-full shrink-0">
                  <span className="w-[3px] bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s", height: "40%" }} />
                  <span className="w-[3px] bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.5s", height: "80%" }} />
                  <span className="w-[3px] bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.2s", height: "30%" }} />
                  <span className="w-[3px] bg-tiktok rounded-full animate-music-bar" style={{ animationDelay: "0.7s", height: "90%" }} />
                  <span className="w-[3px] bg-purple-500 rounded-full animate-music-bar" style={{ animationDelay: "0.4s", height: "50%" }} />
                </div>
              )}
            </div>

            {/* İlerleme Çubuğu */}
            <div className="w-full flex items-center gap-3">
              <span className="text-[10px] text-gray-400 font-mono select-none">
                {formatTime(currentTime)}
              </span>
              <div
                ref={progressRef}
                onClick={handleProgressBarClick}
                className="flex-1 h-1.5 bg-white/10 rounded-full relative cursor-pointer group"
              >
                {/* Glow Efektli İlerleme Çizgisi */}
                <div
                  className="h-full bg-gradient-to-r from-primary to-cyan-glow rounded-full relative transition-all duration-75 shadow-[0_0_8px_rgba(168,85,247,0.8)]"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-primary pointer-events-none"
                  style={{ left: `calc(${(currentTime / duration) * 100}% - 7px)` }}
                />
              </div>
              <span className="text-[10px] text-gray-400 font-mono select-none">
                {formatTime(duration)}
              </span>
            </div>
          </div>

          {/* Sağ: Ses Seviyesi & Tiktok Redirect */}
          <div className="w-full md:w-1/4 flex items-center justify-end gap-4 shrink-0">
            {/* TikTok Redirect Button (Neon Hot Pink!) */}
            <a
              href={currentTrack.tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black bg-[#ff0050] text-white hover:bg-[#e00045] rounded-full active:scale-95 shadow-[0_0_15px_rgba(255,0,80,0.4)] hover:shadow-[0_0_25px_rgba(255,0,80,0.8)] transition-all uppercase tracking-wider shrink-0"
            >
              TikTok'ta Ara <ExternalLink className="h-3 w-3" />
            </a>

            {/* Ses Seviyesi */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX className="h-4.5 w-4.5 text-red-500" /> : <Volume2 className="h-4.5 w-4.5" />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => {
                  setVolume(parseFloat(e.target.value));
                  setIsMuted(false);
                }}
                className="w-16 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* --- MODALS / DIALOGS --- */}

      {/* 1. GİRİŞ YAP MODALI */}
      <Dialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="ViralSound Hub'a Giriş Yap">
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <p className="text-xs text-gray-400 leading-relaxed mb-2">
            Müziklerinizi koleksiyonlar halinde düzenlemek ve favorilerinize eklemek için hemen giriş yapın. Hesabınız yoksa e-posta ve kullanıcı adı yazarak otomatik hesap oluşturabilirsiniz.
          </p>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300">E-posta Adresi</label>
            <Input
              type="email"
              placeholder="ornek@domain.com"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300">Kullanıcı Adı (İsteğe Bağlı)</label>
            <Input
              type="text"
              placeholder="viral_creator"
              value={loginUsername}
              onChange={(e) => setLoginUsername(e.target.value)}
            />
          </div>
          <Button variant="primary" type="submit" className="w-full mt-4 py-3">
            Oturum Aç
          </Button>
        </form>
      </Dialog>

      {/* 2. YENİ KOLEKSİYON MODALI */}
      <Dialog isOpen={isCreateCollectionOpen} onClose={() => setIsCreateCollectionOpen(false)} title="Yeni Koleksiyon Oluştur">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300">Koleksiyon Adı</label>
            <Input
              type="text"
              placeholder="Tiktok Viral Nakaratlar 2026"
              value={newCollName}
              onChange={(e) => setNewCollName(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300">Açıklama (İsteğe Bağlı)</label>
            <textarea
              placeholder="Youtube Shorts ve Reels videolarımda kullanacağım pop-rock nakaratları..."
              value={newCollDesc}
              onChange={(e) => setNewCollDesc(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all min-h-24"
            />
          </div>
          <Button variant="primary" onClick={handleCreateCollection} className="w-full mt-4">
            Koleksiyonu Kaydet
          </Button>
        </div>
      </Dialog>

      {/* 3. KOLEKSİYONA ŞARKI EKLEME MODALI */}
      <Dialog
        isOpen={isAddToCollectionOpen}
        onClose={() => {
          setIsAddToCollectionOpen(false);
          setSelectedTrackToAddToCollection(null);
        }}
        title="Koleksiyona Şarkı Ekle"
      >
        <div className="flex flex-col gap-4">
          {selectedTrackToAddToCollection && (
            <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5 mb-2">
              <img
                src={selectedTrackToAddToCollection.albumArt}
                alt={selectedTrackToAddToCollection.title}
                className="h-11 w-11 rounded-lg object-cover"
              />
              <div>
                <h5 className="font-bold text-white text-sm">{selectedTrackToAddToCollection.title}</h5>
                <p className="text-xs text-gray-400">{selectedTrackToAddToCollection.artist}</p>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-300">Bu şarkıyı hangi koleksiyonunuza eklemek istersiniz?</p>

          {collections.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-xs italic">
              Kayıtlı koleksiyonunuz bulunmuyor. Şarkı eklemeden önce Koleksiyonlarım sekmesinden yeni bir koleksiyon oluşturun!
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
              {collections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleAddTrackToCollection(c.id)}
                  className="w-full text-left bg-white/5 border border-white/5 hover:bg-primary/20 hover:border-primary/30 p-3 rounded-xl flex items-center justify-between text-sm text-gray-200 hover:text-white transition-all cursor-pointer font-semibold"
                >
                  <span>{c.name}</span>
                  <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300">
                    {c.tracks.length} Şarkı
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Dialog>

      {/* 4. TIKTOK & INSTAGRAM REELS SES ÇÖZÜCÜ MODALI */}
      <Dialog
        isOpen={isTikTokResolverOpen}
        onClose={() => {
          setIsTikTokResolverOpen(false);
          setTiktokInputUrl("");
          setSelectedTrackForTikTok(null);
          setTiktokResolveError("");
        }}
        title="TikTok & Instagram Hit Ayarlayıcı"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-gray-300 leading-relaxed">
            Spotify'ın varsayılan önizleme sesi yerine, bu şarkının TikTok veya Instagram Reels üzerindeki asıl viral hit kesitini çalmak ister misiniz?
          </p>
          <div className="text-xs text-gray-400 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-2">
            <p>💡 <strong>Nasıl Yapılır?</strong></p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>TikTok için:</strong> Şarkının çaldığı videonun paylaşım linkini kopyalayıp yapıştırın. Doğrudan video sesi çözülür.</li>
              <li><strong>Instagram için:</strong> Reels video linkini yapıştırın. Instagram korumaları sebebiyle şarkının Reels uyumlu versiyonu TikTok veri havuzundan otomatik bulunup entegre edilir.</li>
            </ul>
          </div>

          <div className="flex flex-col gap-1.5 mt-2">
            <label className="text-xs font-bold text-gray-300">Video veya Reels URL</label>
            <Input
              type="text"
              placeholder="https://www.tiktok.com/@... veya https://www.instagram.com/reels/..."
              value={tiktokInputUrl}
              onChange={(e) => setTiktokInputUrl(e.target.value)}
            />
          </div>

          {tiktokResolveError && (
            <p className="text-xs text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
              {tiktokResolveError}
            </p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <Button
              variant="ghost"
              onClick={() => {
                setIsTikTokResolverOpen(false);
                setTiktokInputUrl("");
                setSelectedTrackForTikTok(null);
                setTiktokResolveError("");
              }}
              className="flex-1 py-3 text-sm"
              disabled={resolvingTikTok}
            >
              Vazgeç
            </Button>
            <Button
              variant="primary"
              onClick={handleResolveTikTokAudio}
              className="flex-1 py-3 text-sm flex items-center justify-center gap-2"
              disabled={resolvingTikTok}
            >
              {resolvingTikTok ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Entegre Ediliyor...
                </>
              ) : (
                "Sesi Çöz ve Aktar"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
