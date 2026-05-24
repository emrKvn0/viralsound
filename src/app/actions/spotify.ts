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
          // En uygun sonucu seç (Varsa sanatçı eşleşmesi)
          const matched = tracks.find((t: any) => 
            t.artist?.name?.toLowerCase().includes(cleanArtist.toLowerCase()) ||
            cleanArtist.toLowerCase().includes(t.artist?.name?.toLowerCase() || "")
          ) || tracks[0];
          
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
          // Sanatçı eşleşmesine göre filtrele
          const matched = results.find((r: any) => 
            r.artistName?.toLowerCase().includes(cleanArtist.toLowerCase()) ||
            cleanArtist.toLowerCase().includes(r.artistName?.toLowerCase() || "")
          ) || results[0];
          
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

    // Spotify sonuçları için önbellekte varsa URL'leri eşleştir (JIT çalışacak)
    const formattedTracks: SpotifyTrack[] = await Promise.all(
      tracks.map(async (track: any) => {
        const title = track.name;
        const artist = track.artists?.[0]?.name || "Bilinmeyen Sanatçı";
        const albumArt =
          track.album?.images?.[0]?.url ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";

        let previewUrl = track.preview_url || "";
        
        if (!previewUrl) {
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

    const formatted: SpotifyTrack[] = await Promise.all(
      results.map(async (item: any) => {
        const title = item.trackName || "Bilinmeyen Şarkı";
        const artist = item.artistName || "Bilinmeyen Sanatçı";
        
        // Artwork yükseltme
        const albumArt =
          item.artworkUrl100?.replace("100x100bb.jpg", "400x400bb.jpg") ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";
          
        let previewUrl = item.previewUrl || "";
        if (!previewUrl) {
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
