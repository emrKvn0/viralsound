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

// Deezer Public API üzerinden resmi stüdyo şarkı kesiti (previewUrl) bulma eylemi (%100 orijinal ve temiz sesler için)
async function fetchDeezerPreviewUrl(artist: string, title: string): Promise<string | null> {
  try {
    const cleanArtist = artist.split("feat.")[0].split("&")[0].trim();
    const cleanTitle = title.split("(")[0].split("-")[0].trim();
    const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
    
    const response = await fetch(
      `https://api.deezer.com/search?q=${query}&limit=1`,
      { next: { revalidate: 3600 } } // 1 saat önbelleğe al
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.data?.[0]?.preview || null;
  } catch (error) {
    console.error("Deezer API bağlanamadı:", error);
    return null;
  }
}

// iTunes Search API üzerinden şarkı kesiti (previewUrl) bulma eylemi (Spotify 2024/2026 kısıtlamalarını aşmak için)
async function fetchiTunesPreviewUrl(artist: string, title: string): Promise<string | null> {
  try {
    const cleanArtist = artist.split("feat.")[0].split("&")[0].trim();
    const cleanTitle = title.split("(")[0].split("-")[0].trim();
    const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);
    
    const response = await fetch(
      `https://itunes.apple.com/search?term=${query}&media=music&limit=1`,
      { next: { revalidate: 3600 } } // 1 saat önbelleğe al
    );
    
    if (!response.ok) return null;
    const data = await response.json();
    return data.results?.[0]?.previewUrl || null;
  } catch (error) {
    console.error("iTunes API bağlanamadı:", error);
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

    // Spotify sonuçları için arka planda iTunes önizleme URL'lerini eşleştir
    const formattedTracks: SpotifyTrack[] = await Promise.all(
      tracks.map(async (track: any) => {
        const title = track.name;
        const artist = track.artists?.[0]?.name || "Bilinmeyen Sanatçı";
        const albumArt =
          track.album?.images?.[0]?.url ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";

        // Spotify'ın kendi preview_url'i varsa doğrudan kullan, Deezer/iTunes isteklerini tamamen atla!
        let previewUrl = track.preview_url;
        
        if (!previewUrl) {
          const trackCacheKey = `${artist}-${title}`.toLowerCase();
          if (previewUrlCache.has(trackCacheKey)) {
            previewUrl = previewUrlCache.get(trackCacheKey)!;
          } else {
            previewUrl =
              (await fetchDeezerPreviewUrl(artist, title)) ||
              (await fetchiTunesPreviewUrl(artist, title)) ||
              `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${Math.floor(Math.random() * 6) + 1}.mp3`;
            previewUrlCache.set(trackCacheKey, previewUrl);
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

    // Sonuçları önbelleğe kaydet
    searchCache.set(cacheKey, formattedTracks);
    return formattedTracks;
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
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=30`
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
          
        let previewUrl = item.previewUrl;
        if (!previewUrl) {
          const trackCacheKey = `${artist}-${title}`.toLowerCase();
          if (previewUrlCache.has(trackCacheKey)) {
            previewUrl = previewUrlCache.get(trackCacheKey)!;
          } else {
            previewUrl =
              (await fetchDeezerPreviewUrl(artist, title)) ||
              "";
            previewUrlCache.set(trackCacheKey, previewUrl);
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

    searchCache.set(cacheKey, formatted);
    return formatted;
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
