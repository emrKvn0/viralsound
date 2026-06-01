"use server";

export interface SpotifyTrack {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  previewUrl: string;
  tiktokUrl: string;
  customPreviewUrl?: string;
  tiktokVideoUrl?: string;
  instagramAudioUrl?: string;
  instagramVideoUrl?: string;
}

// Global bellek içi önbellek (In-Memory Cache) mekanizmaları (0ms gecikme için)
const previewUrlCache = new Map<string, string>();
const searchCache = new Map<string, SpotifyTrack[]>();

// Belirli şarkıların stüdyo (iTunes explicit) kesitleri için el ile özel yönlendirmeler (Out West & Zeze vb. %100 Orijinal Sansürsüz Kesitler)
const STUDIO_PREVIEW_OVERRIDES: Record<string, string> = {
  "jackboys - out west": "https://cdnt-preview.dzcdn.net/api/1/1/b/6/b/0/b6b6faad9c2bb8bdb96be083b2fbb34d.mp3?hdnea=exp=1780344772~acl=/api/1/1/b/6/b/0/b6b6faad9c2bb8bdb96be083b2fbb34d.mp3*~data=user_id=0,application_id=42~hmac=0c24ca99e7324488661135152e26c0c866390e87879dce880658dc424738122f",
  "out west": "https://cdnt-preview.dzcdn.net/api/1/1/b/6/b/0/b6b6faad9c2bb8bdb96be083b2fbb34d.mp3?hdnea=exp=1780344772~acl=/api/1/1/b/6/b/0/b6b6faad9c2bb8bdb96be083b2fbb34d.mp3*~data=user_id=0,application_id=42~hmac=0c24ca99e7324488661135152e26c0c866390e87879dce880658dc424738122f",
  "kodak black - zeze": "https://cdnt-preview.dzcdn.net/api/1/1/c/1/3/0/c13dd0a2fdbb66c76e910be48ca2db6f.mp3?hdnea=exp=1780344777~acl=/api/1/1/c/1/3/0/c13dd0a2fdbb66c76e910be48ca2db6f.mp3*~data=user_id=0,application_id=42~hmac=999f0f96ce45cc7183a61f3b5d0abef23bc93016fff658a34c3f360e43a7dfb7",
  "zeze": "https://cdnt-preview.dzcdn.net/api/1/1/c/1/3/0/c13dd0a2fdbb66c76e910be48ca2db6f.mp3?hdnea=exp=1780344777~acl=/api/1/1/c/1/3/0/c13dd0a2fdbb66c76e910be48ca2db6f.mp3*~data=user_id=0,application_id=42~hmac=999f0f96ce45cc7183a61f3b5d0abef23bc93016fff658a34c3f360e43a7dfb7"
};

// Arama sorgusuna göre viral mem/efekt seslerini MyInstants API'sinden çekip sonuçların sonuna ekleyen akıllı hibrit eylem
async function appendMyInstantsTracks(query: string, currentTracks: SpotifyTrack[]): Promise<SpotifyTrack[]> {
  const queryLower = (query || "").trim().toLowerCase();
  if (!queryLower) return currentTracks;

  // Arama kelimesi popüler mem sesleri içeriyorsa veya sonuç sayısı 6'dan azsa MyInstants'i devreye sok
  const isMemeQuery = 
    queryLower.includes("boom") || 
    queryLower.includes("bruh") || 
    queryLower.includes("fart") || 
    queryLower.includes("meme") || 
    queryLower.includes("ses") || 
    queryLower.includes("effect") || 
    queryLower.includes("sound") || 
    queryLower.includes("sigma") || 
    queryLower.includes("damage") || 
    queryLower.includes("giga") || 
    queryLower.includes("chad") ||
    queryLower.includes("emotional");

  if (isMemeQuery || currentTracks.length < 6) {
    try {
      console.log(`[MyInstants Entegrasyonu] Viral Ses/Mem aranıyor: "${queryLower}"`);
      const response = await fetch(`https://www.myinstants.com/api/v1/instants/?search=${encodeURIComponent(queryLower)}`, {
        signal: AbortSignal.timeout(2500)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results.length > 0) {
          const instantsTracks: SpotifyTrack[] = data.results.slice(0, 5).map((item: any) => ({
            id: `myinstants-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.floor(Math.random() * 1000)}`,
            title: item.name.toUpperCase(),
            artist: "Viral Ses / Mem",
            albumArt: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop", // Neon müzik ve ses dalgası kapak görseli
            previewUrl: item.sound,
            tiktokUrl: `https://www.google.com/search?q=site:tiktok.com+${encodeURIComponent(item.name)}&btnI=I`,
            customPreviewUrl: item.sound,
            instagramAudioUrl: item.sound
          }));
          
          // Mevcut listeye ekle (aynı isimde olanları süzerek)
          const existingTitles = new Set(currentTracks.map(t => t.title.toLowerCase()));
          const uniqueNew = instantsTracks.filter(t => !existingTitles.has(t.title.toLowerCase()));
          
          // Mem sorgularında başa ekle, normal sorgularda en arkaya ekle
          if (isMemeQuery) {
            return [...uniqueNew, ...currentTracks];
          } else {
            return [...currentTracks, ...uniqueNew];
          }
        }
      }
    } catch (error) {
      console.warn("[MyInstants Entegrasyonu] Arama atlandı veya zaman aşımına uğradı.");
    }
  }

  return currentTracks;
}

// Deezer Public API üzerinden kademeli stüdyo şarkı kesiti bulma eylemi
async function fetchDeezerPreviewUrl(artist: string, title: string): Promise<string | null> {
  const cleanArtist = artist.split("feat.")[0].split("&")[0].trim();
  const cleanTitle = title.split("(")[0].split("-")[0].trim();
  
  // Arama Aşamaları
  const searchQueries = [
    `${artist} ${title}`, // Aşama 1: Tam isim (Doğal arama)
    `${cleanArtist} ${cleanTitle}`, // Aşama 2: Temizlenmiş isim
  ];

  for (const query of searchQueries) {
    try {
      const response = await fetch(
        `https://api.deezer.com/search?q=${encodeURIComponent(query)}&limit=3`,
        { cache: "no-store" }
      );
      
      if (response.ok) {
        const data = await response.json();
        const tracks = data.data || [];
        if (tracks.length > 0) {
          // Explicit (sansürsüz) olanları en üste taşıyalım
          const sortedTracks = [...tracks].sort((a, b) => {
            const aExp = a.explicit_lyrics ? 1 : 0;
            const bExp = b.explicit_lyrics ? 1 : 0;
            return bExp - aExp;
          });

          // En uygun sonucu seç (Varsa sanatçı eşleşmesi)
          const matched = sortedTracks.find((t: any) => 
            t.artist?.name?.toLowerCase().includes(cleanArtist.toLowerCase()) ||
            cleanArtist.toLowerCase().includes(t.artist?.name?.toLowerCase() || "")
          ) || sortedTracks[0];
          
          if (matched.preview) {
            console.log(`[Deezer JIT] Bulundu: "${matched.artist?.name} - ${matched.title}" -> ${query}`);
            return matched.preview;
          }
        }
      }
    } catch (error) {
      console.warn(`Deezer API sorgu hatası (${query}):`, error);
    }
  }
  return null;
}

// iTunes Search API üzerinden kademeli şarkı kesiti bulma eylemi (TR ve ENG uyumlu)
async function fetchiTunesPreviewUrl(artist: string, title: string): Promise<string | null> {
  const cleanArtist = artist.split("feat.")[0].split("&")[0].trim();
  const cleanTitle = title.split("(")[0].split("-")[0].trim();
  
  // Türkçe karakter kontrolü (Şarkı veya sanatçıda Türkçe karakterler varsa TR mağazasını önceliklendir)
  const isTurkish = /[çğıöşüÂÇĞİÖŞÜ]/.test(`${artist} ${title}`);
  
  // Kademeli Arama Aşamaları
  // Her aşama için [arama terimi, ülke kodu (isteğe bağlı)]
  const stages: [string, string | null][] = [
    [`${artist} ${title}`, null], // Aşama 1: Tam adıyla global arama
    [`${cleanArtist} ${cleanTitle}`, null], // Aşama 2: Temizlenmiş adıyla global arama
  ];

  // Türkçe ise TR aramasını en başa ekle, değilse sonlara fallback olarak ekle
  if (isTurkish) {
    stages.unshift([`${cleanArtist} ${cleanTitle}`, "TR"]);
  } else {
    stages.push([`${cleanArtist} ${cleanTitle}`, "TR"]);
    stages.push([`${cleanArtist} ${cleanTitle}`, "US"]);
  }

  for (const [query, country] of stages) {
    try {
      const countryParam = country ? `&country=${country}` : "";
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=3${countryParam}`;
      
      const response = await fetch(url, { cache: "no-store" });
      
      if (response.ok) {
        const data = await response.json();
        const results = data.results || [];
        if (results.length > 0) {
          // Explicit (sansürsüz) olanları en üste taşıyalım
          const sortedResults = [...results].sort((a, b) => {
            const aExp = a.trackExplicitness === "explicit" ? 1 : 0;
            const bExp = b.trackExplicitness === "explicit" ? 1 : 0;
            return bExp - aExp;
          });

          // Sanatçı eşleşmesine göre filtrele
          const matched = sortedResults.find((r: any) => 
            r.artistName?.toLowerCase().includes(cleanArtist.toLowerCase()) ||
            cleanArtist.toLowerCase().includes(r.artistName?.toLowerCase() || "")
          ) || sortedResults[0];
          
          if (matched.previewUrl) {
            console.log(`[iTunes JIT] Bulundu (${country || "global"}): "${matched.artistName} - ${matched.trackName}" -> ${query}`);
            return matched.previewUrl;
          }
        }
      }
    } catch (error) {
      console.warn(`iTunes API sorgu hatası (${query} - ${country}):`, error);
    }
  }
  return null;
}

// Just-in-Time (JIT) önizleme URL çözücü Server Action
export async function resolveTrackPreviewUrl(artist: string, title: string, trackId: string): Promise<string | null> {
  try {
    const normTitle = (title || "").toLowerCase().trim();
    const normArtist = (artist || "").toLowerCase().trim();

    // Akıllı temizleme
    const cleanTitle = normTitle.split("(")[0].split("-")[0].split("feat.")[0].split("with")[0].trim();
    const cleanArtist = normArtist.split("feat.")[0].split("&")[0].split("with")[0].trim();

    const key1 = `${cleanArtist} - ${cleanTitle}`;
    const key2 = cleanTitle;

    // Özel stüdyo kesiti yönlendirmesini kontrol et
    const overrideUrl = STUDIO_PREVIEW_OVERRIDES[key1] || STUDIO_PREVIEW_OVERRIDES[key2];
    if (overrideUrl) {
      console.log(`[JIT Override] "${artist} - ${title}" için özel stüdyo kesiti kullanılıyor.`);
      return overrideUrl;
    }

    const trackCacheKey = `${artist}-${title}`.toLowerCase();
    
    // 1. Bellek içi önbelleği kontrol et
    if (previewUrlCache.has(trackCacheKey)) {
      console.log(`[JIT Cache Hit] "${artist} - ${title}" önbellekten getirildi.`);
      return previewUrlCache.get(trackCacheKey)!;
    }

    console.log(`[JIT Çözücü] "${artist} - ${title}" (${trackId}) için stüdyo kesiti aranıyor...`);

    // 2. iTunes kademeli arama yap (En yüksek başarı oranı ve kaliteli ses)
    const iTunesUrl = await fetchiTunesPreviewUrl(artist, title);
    if (iTunesUrl) {
      previewUrlCache.set(trackCacheKey, iTunesUrl);
      return iTunesUrl;
    }

    // 3. Fallback: Deezer arama yap
    const deezerUrl = await fetchDeezerPreviewUrl(artist, title);
    if (deezerUrl) {
      previewUrlCache.set(trackCacheKey, deezerUrl);
      return deezerUrl;
    }

    console.warn(`[JIT Çözücü] "${artist} - ${title}" için hiçbir stüdyo kesiti bulunamadı.`);
    return null;
  } catch (error) {
    console.error(`[JIT Çözücü] Çözümleme sırasında beklenmedik hata:`, error);
    return null;
  }
}


// TikTok Arama & Yönlendirme Yardımcısı
export async function getTikTokRedirectUrl(artist: string, title: string): Promise<string> {
  const sanitizedQuery = encodeURIComponent(`${artist} - ${title}`);
  return `https://www.google.com/search?q=site:tiktok.com/music+${sanitizedQuery}&btnI=I`;
}

// Güvenli Arama Motoru (Spotify + iTunes Hybrid)
export async function searchTracks(query: string): Promise<SpotifyTrack[]> {
  const cacheKey = (query || "trending_default").trim().toLowerCase();
  
  // 1. Arama sorgusu önbellekte varsa ANINDA (0ms) döndür!
  if (searchCache.has(cacheKey)) {
    console.log(`[Cache Hit] Arama Önbellekten Getirildi: ${cacheKey}`);
    return searchCache.get(cacheKey)!;
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // Spotify anahtarları girilmemişse veya boş ise DOĞRUDAN iTunes Search API'yi kullan!
  const isMockEnv =
    !clientId ||
    !clientSecret ||
    clientId.includes("here") ||
    clientSecret.includes("here");

  if (isMockEnv) {
    if (!query) {
      return searchiTunesDirect("trending");
    }
    return searchiTunesDirect(query);
  }

  try {
    // Spotify Access Token Al
    const authString = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authString}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      console.warn("Spotify Token alınamadı, iTunes API'ye dönülüyor...");
      return searchiTunesDirect(query || "trending");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Spotify Arama Yap
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query || "year:2025-2026"
    )}&type=track&limit=30`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!searchResponse.ok) {
      console.warn("Spotify Arama başarısız, iTunes API'ye dönülüyor...");
      return searchiTunesDirect(query || "trending");
    }

    const searchData = await searchResponse.json();
    const tracks = searchData.tracks?.items || [];

    // Explicit (Sansürsüz) şarkıları önceliklendirme ve sansürlü olan mükerrerleri temizleme
    const uniqueTracksMap = new Map<string, any>();
    for (const track of tracks) {
      const key = `${(track.name || "").toLowerCase()} - ${(track.artists?.[0]?.name || "").toLowerCase()}`;
      const existing = uniqueTracksMap.get(key);
      if (!existing || (track.explicit && !existing.explicit)) {
        uniqueTracksMap.set(key, track);
      }
    }
    const filteredTracks = Array.from(uniqueTracksMap.values());

    // Explicit olanları listenin üst sıralarına taşıyalım (Trap/Rap şarkıları için harika bir deneyim)
    filteredTracks.sort((a, b) => {
      const aExp = a.explicit ? 1 : 0;
      const bExp = b.explicit ? 1 : 0;
      return bExp - aExp;
    });

    // Spotify sonuçları için önbellekte varsa URL'leri eşleştir (JIT çalışacak)
    const formattedTracks: SpotifyTrack[] = await Promise.all(
      filteredTracks.map(async (track: any) => {
        const title = track.name;
        const artist = track.artists?.[0]?.name || "Bilinmeyen Sanatçı";
        const albumArt =
          track.album?.images?.[0]?.url ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";

        const normTitle = (title || "").toLowerCase().trim();
        const normArtist = (artist || "").toLowerCase().trim();
        const cleanTitle = normTitle.split("(")[0].split("-")[0].split("feat.")[0].split("with")[0].trim();
        const cleanArtist = normArtist.split("feat.")[0].split("&")[0].split("with")[0].trim();
        const key1 = `${cleanArtist} - ${cleanTitle}`;
        const key2 = cleanTitle;

        // Özel stüdyo kesiti yönlendirmesini kontrol et
        const overrideUrl = STUDIO_PREVIEW_OVERRIDES[key1] || STUDIO_PREVIEW_OVERRIDES[key2];
        let previewUrl = overrideUrl || track.preview_url || "";
        
        // Eğer rap/trap şarkısı ise ve sansürlü olma ihtimali varsa, Spotify'ın varsayılan önizlemesini boşverip iTunes/Deezer explicit çözücümüzü zorlayalım!
        const isRapOrTrap = query.toLowerCase().includes("rap") || 
                            query.toLowerCase().includes("trap") ||
                            cleanArtist.includes("kodak") ||
                            cleanArtist.includes("jackboys") ||
                            cleanArtist.includes("travis") ||
                            cleanTitle.includes("zeze") ||
                            cleanTitle.includes("out west");

        if (isRapOrTrap && !track.explicit && !overrideUrl) {
          previewUrl = ""; // JIT çözücüyü zorlar
        } else if (!previewUrl) {
          const trackCacheKey = `${artist}-${title}`.toLowerCase();
          if (previewUrlCache.has(trackCacheKey)) {
            previewUrl = previewUrlCache.get(trackCacheKey)!;
          }
        }

        const tiktokUrl = await getTikTokRedirectUrl(artist, title);

        return {
          id: track.id,
          title,
          artist,
          albumArt,
          previewUrl,
          tiktokUrl,
        };
      })
    );

    // Sonuçları önbelleğe kaydet ve MyInstants viral seslerini ekle
    const finalTracks = await appendMyInstantsTracks(query, formattedTracks);
    searchCache.set(cacheKey, finalTracks);
    return finalTracks;
  } catch (error) {
    console.error("Spotify API arama hatası, iTunes'a geçiliyor:", error);
    return searchiTunesDirect(query || "trending");
  }
}

// Doğrudan iTunes Search API Arama Yardımcısı
async function searchiTunesDirect(query: string): Promise<SpotifyTrack[]> {
  const cacheKey = `itunes_${(query || "trending_default").trim().toLowerCase()}`;
  
  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }
 
  try {
    const searchTerm = query === "trending" ? "hits 2026" : query;
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=30&country=TR`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const results = data.results || [];

    // iTunes tarafında da explicit (sansürsüz) şarkıları önceliklendirme ve temizleme
    const uniqueiTunesMap = new Map<string, any>();
    for (const item of results) {
      const key = `${(item.trackName || "").toLowerCase()} - ${(item.artistName || "").toLowerCase()}`;
      const existing = uniqueiTunesMap.get(key);
      const isExplicit = item.trackExplicitness === "explicit";
      const existingExplicit = existing?.trackExplicitness === "explicit";
      if (!existing || (isExplicit && !existingExplicit)) {
        uniqueiTunesMap.set(key, item);
      }
    }
    const filterediTunesResults = Array.from(uniqueiTunesMap.values());

    // Explicit olanları en üst sıralara taşıyalım
    filterediTunesResults.sort((a, b) => {
      const aExp = a.trackExplicitness === "explicit" ? 1 : 0;
      const bExp = b.trackExplicitness === "explicit" ? 1 : 0;
      return bExp - aExp;
    });

    const formatted: SpotifyTrack[] = await Promise.all(
      filterediTunesResults.map(async (item: any) => {
        const title = item.trackName || "Bilinmeyen Şarkı";
        const artist = item.artistName || "Bilinmeyen Sanatçı";
        
        // Artwork yükseltme
        const albumArt =
          item.artworkUrl100?.replace("100x100bb.jpg", "400x400bb.jpg") ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";
          
        const normTitle = (title || "").toLowerCase().trim();
        const normArtist = (artist || "").toLowerCase().trim();
        const cleanTitle = normTitle.split("(")[0].split("-")[0].split("feat.")[0].split("with")[0].trim();
        const cleanArtist = normArtist.split("feat.")[0].split("&")[0].split("with")[0].trim();
        const key1 = `${cleanArtist} - ${cleanTitle}`;
        const key2 = cleanTitle;

        // Özel stüdyo kesiti yönlendirmesini kontrol et
        const overrideUrl = STUDIO_PREVIEW_OVERRIDES[key1] || STUDIO_PREVIEW_OVERRIDES[key2];
        let previewUrl = overrideUrl || item.previewUrl || "";
        
        const isExplicit = item.trackExplicitness === "explicit";
        const isRapOrTrap = query.toLowerCase().includes("rap") || 
                            query.toLowerCase().includes("trap") ||
                            cleanArtist.includes("kodak") ||
                            cleanArtist.includes("jackboys") ||
                            cleanArtist.includes("travis") ||
                            cleanTitle.includes("zeze") ||
                            cleanTitle.includes("out west");

        if (isRapOrTrap && !isExplicit && !overrideUrl) {
          previewUrl = ""; // JIT çözücüyü zorlar
        } else if (!previewUrl) {
          const trackCacheKey = `${artist}-${title}`.toLowerCase();
          if (previewUrlCache.has(trackCacheKey)) {
            previewUrl = previewUrlCache.get(trackCacheKey)!;
          }
        }
        const tiktokUrl = await getTikTokRedirectUrl(artist, title);

        return {
          id: `itunes-${item.trackId || Math.random()}`,
          title,
          artist,
          albumArt,
          previewUrl,
          tiktokUrl,
        };
      })
    );

    const finalTracks = await appendMyInstantsTracks(query, formatted);
    searchCache.set(cacheKey, finalTracks);
    return finalTracks;
  } catch (error) {
    console.error("iTunes doğrudan arama hatası:", error);
    return [];
  }
}

// Çoklu Şarkı Sorgularını Sunucu Tarafında Tek Seferde Paralel Çözme (Bulk/Batch Search)
export async function searchTracksBulk(queries: string[]): Promise<SpotifyTrack[]> {
  try {
    const promises = queries.map(query => 
      searchTracks(query).then(res => res[0] || null)
    );
    const results = await Promise.all(promises);
    return results.filter((t): t is SpotifyTrack => t !== null);
  } catch (error) {
    console.error("Toplu arama hatası:", error);
    return [];
  }
}

// iTunes Live RSS Charts üzerinden tam otomatik, gerçek zamanlı trend/çalma listeleri çeken Server Action
export async function fetchDynamicTrending(
  language: "all" | "tr" | "global",
  genre: "all" | "pop" | "rap" | "rock" | "dance" | "r&b" | "trap"
): Promise<SpotifyTrack[]> {
  try {
    const feeds = [];
    if (language === "tr" || language === "all") {
      feeds.push({ url: "https://itunes.apple.com/tr/rss/topsongs/limit=50/json", country: "tr" });
    }
    if (language === "global" || language === "all") {
      feeds.push({ url: "https://itunes.apple.com/us/rss/topsongs/limit=50/json", country: "global" });
    }

    const responses = await Promise.all(
      feeds.map(feed => 
        fetch(feed.url, { cache: "no-store" }) // Canlı ve taze veri çekmek için önbelleği devre dışı bırak
          .then(res => (res.ok ? res.json() : null))
          .then(data => ({ data, country: feed.country }))
          .catch(() => ({ data: null, country: feed.country }))
      )
    );

    let allEntries: any[] = [];
    for (const res of responses) {
      if (res.data && res.data.feed && res.data.feed.entry) {
        const entries = Array.isArray(res.data.feed.entry) ? res.data.feed.entry : [res.data.feed.entry];
        allEntries = [...allEntries, ...entries.map((entry: any) => ({ ...entry, country: res.country }))];
      }
    }

    // "all" modunda TR ve Global şarkıları fermuar (interleave) şeklinde karıştır
    if (language === "all" && responses.length > 1) {
      const trEntries = allEntries.filter(e => e.country === "tr");
      const glEntries = allEntries.filter(e => e.country === "global");
      const mixed = [];
      const maxLength = Math.max(trEntries.length, glEntries.length);
      for (let i = 0; i < maxLength; i++) {
        if (trEntries[i]) mixed.push(trEntries[i]);
        if (glEntries[i]) mixed.push(glEntries[i]);
      }
      allEntries = mixed;
    }

    // Türlere (genre) göre filtrele
    if (genre !== "all") {
      const genreLower = genre.toLowerCase();
      allEntries = allEntries.filter(entry => {
        const cat = (entry.category?.attributes?.term || "").toLowerCase();
        if (genreLower === "pop") return cat.includes("pop");
        if (genreLower === "rap") return cat.includes("rap") || cat.includes("hip-hop") || cat.includes("hip hop");
        if (genreLower === "trap") return cat.includes("trap") || cat.includes("rap") || cat.includes("hip-hop") || cat.includes("hip hop");
        if (genreLower === "rock") return cat.includes("rock") || cat.includes("alternative");
        if (genreLower === "dance") return cat.includes("dance") || cat.includes("electronic") || cat.includes("house");
        if (genreLower === "r&b") return cat.includes("r&b") || cat.includes("soul") || cat.includes("rb");
        return true;
      });
    }

    // entry'leri SpotifyTrack formatına eşleştir
    const formatted: SpotifyTrack[] = allEntries.map(entry => {
      const title = entry["im:name"]?.label || "Bilinmeyen Şarkı";
      const artist = entry["im:artist"]?.label || "Bilinmeyen Sanatçı";
      
      const images = entry["im:image"] || [];
      const albumArt = images[images.length - 1]?.label?.replace("170x170bb.png", "400x400bb.png") || 
                       "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";

      let previewUrl = "";
      const links = entry.link || [];
      // Array olup olmadığını kontrol et
      if (Array.isArray(links)) {
        const previewLink = links.find((l: any) => l.attributes?.["im:assetType"] === "preview");
        if (previewLink) {
          previewUrl = previewLink.attributes.href;
        }
      } else if (links.attributes?.["im:assetType"] === "preview") {
        previewUrl = links.attributes.href;
      }

      const normTitle = (title || "").toLowerCase().trim();
      const normArtist = (artist || "").toLowerCase().trim();
      const cleanTitle = normTitle.split("(")[0].split("-")[0].split("feat.")[0].split("with")[0].trim();
      const cleanArtist = normArtist.split("feat.")[0].split("&")[0].split("with")[0].trim();
      const key1 = `${cleanArtist} - ${cleanTitle}`;
      const key2 = cleanTitle;

      // Özel stüdyo kesiti yönlendirmesini kontrol et
      const overrideUrl = STUDIO_PREVIEW_OVERRIDES[key1] || STUDIO_PREVIEW_OVERRIDES[key2];
      if (overrideUrl) {
        previewUrl = overrideUrl;
      } else {
        const isRapOrTrap = genre === "rap" || 
                            cleanArtist.includes("kodak") || 
                            cleanArtist.includes("jackboys") ||
                            cleanArtist.includes("travis") ||
                            cleanTitle.includes("zeze") ||
                            cleanTitle.includes("out west");
        
        if (isRapOrTrap) {
          previewUrl = ""; // JIT çözücüyü zorla ki sansürsüz explicit iTunes kesiti çekilsin!
        }
      }

      const id = entry.id?.attributes?.["im:id"] ? `itunes-${entry.id.attributes["im:id"]}` : `dynamic-${Math.random()}`;

      // Arama yönlendirmesi
      const sanitizedQuery = encodeURIComponent(`${artist} - ${title}`);
      const tiktokUrl = `https://www.google.com/search?q=site:tiktok.com/music+${sanitizedQuery}&btnI=I`;

      return {
        id,
        title,
        artist,
        albumArt,
        previewUrl,
        tiktokUrl
      };
    });

    // Çift kayıtları (duplicates) önle
    const seen = new Set<string>();
    return formatted.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

  } catch (error) {
    console.error("Dinamik trend yükleme hatası:", error);
    return [];
  }
}
