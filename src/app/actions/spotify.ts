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
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

  // Spotify anahtarları girilmemişse veya boş ise DOĞRUDAN iTunes Search API'yi kullan!
  // Bu sayede kullanıcı Spotify Developer hesabı açmadan dahi %100 GERÇEK şarkıları ve sesleri aratabilir!
  const isMockEnv =
    !clientId ||
    !clientSecret ||
    clientId.includes("here") ||
    clientSecret.includes("here");

  if (isMockEnv) {
    if (!query) {
      // Varsayılan trend şarkılar için iTunes'tan popüler parçaları çek
      return searchiTunesDirect("trending");
    }
    return searchiTunesDirect(query);
  }

  try {
    // 1. Spotify Access Token Al
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

    // 2. Spotify Arama Yap
    const searchUrl = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
      query || "year:2025-2026"
    )}&type=track&limit=15`;
    
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

    // 3. Spotify sonuçları için arka planda iTunes önizleme URL'lerini eşleştir
    const formattedTracks: SpotifyTrack[] = await Promise.all(
      tracks.map(async (track: any) => {
        const title = track.name;
        const artist = track.artists?.[0]?.name || "Bilinmeyen Sanatçı";
        const albumArt =
          track.album?.images?.[0]?.url ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";

        // Spotify'ın NULL dönen preview_url'i yerine iTunes'tan taze 30s kesit buluyoruz!
        const previewUrl =
          (await fetchiTunesPreviewUrl(artist, title)) ||
          track.preview_url ||
          `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${Math.floor(Math.random() * 6) + 1}.mp3`;

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

    return formattedTracks;
  } catch (error) {
    console.error("Spotify API arama hatası, iTunes'a geçiliyor:", error);
    return searchiTunesDirect(query || "trending");
  }
}

// Doğrudan iTunes Search API Arama Yardımcısı
async function searchiTunesDirect(query: string): Promise<SpotifyTrack[]> {
  try {
    const searchTerm = query === "trending" ? "hits 2026" : query;
    const response = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&limit=15`
    );

    if (!response.ok) return [];

    const data = await response.json();
    const results = data.results || [];

    const formatted: SpotifyTrack[] = await Promise.all(
      results.map(async (item: any) => {
        const title = item.trackName || "Bilinmeyen Şarkı";
        const artist = item.artistName || "Bilinmeyen Sanatçı";
        
        // 100x100 kapak resmini premium görünüm için 400x400 boyutuna yükseltiyoruz
        const albumArt =
          item.artworkUrl100?.replace("100x100bb.jpg", "400x400bb.jpg") ||
          "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop";
          
        const previewUrl = item.previewUrl || "";
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

    return formatted;
  } catch (error) {
    console.error("iTunes doğrudan arama hatası:", error);
    return [];
  }
}
