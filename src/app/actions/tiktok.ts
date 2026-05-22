"use server";

import { SpotifyTrack } from "./spotify";

export interface TikTokAudioInfo {
  title: string;
  author: string;
  playUrl: string;
  coverUrl: string;
}

// TikTok video URL'sinden MP3 ses linkini çıkaran API entegrasyonu (TikWM API kullanarak)
export async function extractTikTokAudio(videoUrl: string): Promise<TikTokAudioInfo | null> {
  try {
    if (!videoUrl) return null;
    
    console.log("TikTok videosundan ses çözümleniyor:", videoUrl);
    
    // TikWM API kullanarak videonun filigransız halini ve ses bilgilerini çekiyoruz
    const response = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(videoUrl)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!response.ok) {
      console.error("TikWM API hatası:", response.statusText);
      return null;
    }

    const resData = await response.json();
    
    if (resData.code !== 0 || !resData.data) {
      console.error("TikTok videosu çözümlenemedi:", resData.msg || "Bilinmeyen hata");
      return null;
    }

    const music = resData.data.music;
    if (!music || !music.play) {
      console.error("TikTok videosunda ses bulunamadı");
      return null;
    }

    return {
      title: music.title || "TikTok Sesi",
      author: music.author || "Bilinmeyen Sanatçı",
      playUrl: music.play, // Doğrudan MP3 linki!
      coverUrl: music.cover || "",
    };
  } catch (error) {
    console.error("TikTok ses çözümleme hatası:", error);
    return null;
  }
}

// Şarkı adı ve sanatçı adıyla TikTok'ta otomatik arama yapıp sesi çözen API entegrasyonu (Akıllı Puanlama Algoritmalı)
export async function autoResolveTikTokAudio(title: string, artist: string): Promise<{ playUrl: string; videoUrl: string } | null> {
  try {
    const keywords = `${artist} ${title}`.trim();
    console.log("Otomatik TikTok sesi aranıyor (Akıllı Filtreleme ile):", keywords);

    const response = await fetch("https://www.tikwm.com/api/feed/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: new URLSearchParams({
        keywords: keywords,
        count: "10" // İlk 10 videoyu çekip analiz ediyoruz!
      })
    });

    if (!response.ok) {
      console.error("TikWM Search API hatası:", response.statusText);
      return null;
    }

    const resData = await response.json();
    if (resData.code !== 0 || !resData.data || !resData.data.videos || resData.data.videos.length === 0) {
      console.error("TikTok aramasında sonuç bulunamadı:", keywords);
      return null;
    }

    const videos = resData.data.videos;
    let bestVideo = null;
    let bestScore = -9999;

    const blacklist = ["remix", "reverb", "sped up", "slowed", "concert", "live", "konser", "cover", "mashup", "acoustic", "instrumental", "karaoke", "edit", "bootleg", "tribute", "trap", "bass boosted", "nightcore", "dj", "remixli", "editli", "slow", "spedup", "remixed", "mash-up"];
    const originalKeywords = ["original sound", "orijinal ses", "official", "original track", "studio version", "album version", "original version", "official audio", "official music", "official video"];

    for (const video of videos) {
      let score = 100;
      const videoTitle = (video.title || "").toLowerCase();
      const musicTitle = (video.music_info?.title || "").toLowerCase();
      const musicAuthor = (video.music_info?.author || "").toLowerCase();
      const authorName = (video.author?.nickname || "").toLowerCase();
      const duration = video.duration || 0;

      // 1. Kara Liste Cezaları (Konser, remix, sped-up vb. filtreleme)
      for (const word of blacklist) {
        if (videoTitle.includes(word)) score -= 150;
        if (musicTitle.includes(word)) score -= 180;
      }

      // 2. Süre Cezalandırma ve Ödüllendirme (Kısa editlemeleri engelleme)
      if (duration > 0) {
        if (duration < 12) {
          score -= 300; // Çok kısa kalitesiz kliplere ağır ceza
        } else if (duration < 15) {
          score -= 120; // 12-15s arası kısa kesit cezası
        } else if (duration >= 20 && duration <= 60) {
          score += 40;  // 20-60s ideal viral ses ödülü
        }
      }

      // 3. Doğru Sanatçı ve Şarkı Adı Ödülleri
      const lowerArtist = artist.toLowerCase();
      const lowerTitle = title.toLowerCase();

      if (musicAuthor === lowerArtist) {
        score += 100;
      } else if (musicAuthor.includes(lowerArtist) || authorName.includes(lowerArtist)) {
        score += 50;
      }

      if (musicTitle === lowerTitle) {
        score += 120;
      } else if (musicTitle.includes(lowerTitle) || videoTitle.includes(lowerTitle)) {
        score += 60;
      }

      // 4. Orijinal/Stüdyo Versiyon Teşvikleri
      for (const keyword of originalKeywords) {
        if (musicTitle.includes(keyword) || videoTitle.includes(keyword)) {
          score += 60;
        }
      }
      if (video.author?.verified) {
        score += 20;
      }

      console.log(`[TikTok Puanlama] Başlık: "${videoTitle.substring(0, 35)}" | Müzik: "${musicTitle.substring(0, 35)}" | Süre: ${duration}s | Skor: ${score}`);

      // Müzik çalma linki kontrolü
      const playUrl = video.music || video.music_info?.play;
      if (!playUrl) continue;

      if (score > bestScore) {
        bestScore = score;
        bestVideo = video;
      }
    }

    if (!bestVideo) {
      console.error("Skorlama sonrasında uygun video bulunamadı.");
      return null;
    }

    console.log(`En iyi TikTok videosu seçildi. Skor: ${bestScore}, Müzik: ${bestVideo.music_info?.title || "Bilinmiyor"}`);

    const playUrl = bestVideo.music || bestVideo.music_info?.play;
    const authorUniqueId = bestVideo.author?.unique_id || "tiktok";
    const videoId = bestVideo.video_id;
    const videoUrl = `https://www.tiktok.com/@${authorUniqueId}/video/${videoId}`;

    return {
      playUrl,
      videoUrl
    };
  } catch (error) {
    console.error("Otomatik TikTok çözme hatası:", error);
    return null;
  }
}

// Şarkı adı ve sanatçı adıyla Instagram Reels için TikTok'ta otomatik arama yapıp Reels sesini çözen API entegrasyonu
export async function autoResolveInstagramAudio(title: string, artist: string): Promise<{ playUrl: string; videoUrl: string } | null> {
  try {
    // Reels version gibi kirletici kelimeler eklemek yerine doğrudan sanatçı ve şarkıyı arayıp Reels sesini seçtiriyoruz.
    const keywords = `${artist} ${title}`.trim();
    console.log("Instagram Reels sesi TikTok'ta aranıyor:", keywords);

    const response = await fetch("https://www.tikwm.com/api/feed/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: new URLSearchParams({
        keywords: keywords,
        count: "10"
      })
    });

    if (!response.ok) {
      console.error("TikWM Search API hatası (Reels):", response.statusText);
      return null;
    }

    const resData = await response.json();
    if (resData.code !== 0 || !resData.data || !resData.data.videos || resData.data.videos.length === 0) {
      return autoResolveInstagramAudioFallback(title, artist);
    }

    const videos = resData.data.videos;
    return selectBestReelsVideo(videos, title, artist);
  } catch (error) {
    console.error("Instagram Reels ses çözme hatası:", error);
    return null;
  }
}

// Reels araması için fallback arama
async function autoResolveInstagramAudioFallback(title: string, artist: string): Promise<{ playUrl: string; videoUrl: string } | null> {
  try {
    const keywords = `${artist} ${title} original sound`.trim();
    console.log("Instagram Reels Fallback aranıyor:", keywords);

    const response = await fetch("https://www.tikwm.com/api/feed/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      body: new URLSearchParams({
        keywords: keywords,
        count: "10"
      })
    });

    if (!response.ok) return null;

    const resData = await response.json();
    if (resData.code !== 0 || !resData.data || !resData.data.videos || resData.data.videos.length === 0) {
      return autoResolveTikTokAudio(title, artist);
    }

    return selectBestReelsVideo(resData.data.videos, title, artist);
  } catch (error) {
    return null;
  }
}

// Reels videoları içinden en iyisini seçme algoritması
function selectBestReelsVideo(videos: any[], title: string, artist: string): { playUrl: string; videoUrl: string } | null {
  let bestVideo = null;
  let bestScore = -9999;

  // Reels versiyonu için de stüdyo dışı remix/edit sesleri cezalandırıyoruz.
  const blacklist = ["remix", "reverb", "sped up", "slowed", "concert", "live", "konser", "cover", "mashup", "acoustic", "instrumental", "karaoke", "edit", "bootleg", "tribute", "trap", "bass boosted", "nightcore", "dj", "remixli", "editli", "slow", "spedup", "remixed", "mash-up"];
  const reelsKeywords = ["reels", "reel", "instagram", "ig", "tiktok version"];
  const originalKeywords = ["original sound", "orijinal ses", "official", "original track", "studio version", "album version", "original version", "official audio", "official music", "official video"];

  for (const video of videos) {
    let score = 100;
    const videoTitle = (video.title || "").toLowerCase();
    const musicTitle = (video.music_info?.title || "").toLowerCase();
    const musicAuthor = (video.music_info?.author || "").toLowerCase();
    const duration = video.duration || 0;

    // 1. Kara Liste Filtresi (Remix/Edit versiyonlar elensin)
    for (const word of blacklist) {
      if (videoTitle.includes(word)) score -= 150;
      if (musicTitle.includes(word)) score -= 180;
    }

    // 2. Süre Cezalandırma ve Ödüllendirme (Kısa editlemeleri engelleme)
    if (duration > 0) {
      if (duration < 12) {
        score -= 300; // Çok kısa kalitesiz kliplere ağır ceza
      } else if (duration < 15) {
        score -= 120; // 12-15s arası kısa kesit cezası
      } else if (duration >= 20 && duration <= 60) {
        score += 40;  // 20-60s ideal Reels viral ses ödülü
      }
    }

    // 3. Reels & Instagram Kelime Ödülleri
    for (const word of reelsKeywords) {
      if (videoTitle.includes(word)) score += 40;
      if (musicTitle.includes(word)) score += 30;
    }

    // 4. Orijinal/Stüdyo Versiyon Teşvikleri
    for (const keyword of originalKeywords) {
      if (musicTitle.includes(keyword) || videoTitle.includes(keyword)) {
        score += 60;
      }
    }

    // 5. Doğru Sanatçı ve Şarkı Ödülleri
    const lowerArtist = artist.toLowerCase();
    const lowerTitle = title.toLowerCase();

    if (musicAuthor === lowerArtist) {
      score += 100;
    } else if (musicAuthor.includes(lowerArtist)) {
      score += 50;
    }
    
    if (musicTitle === lowerTitle) {
      score += 120;
    } else if (musicTitle.includes(lowerTitle)) {
      score += 60;
    }

    console.log(`[Reels Puanlama] Başlık: "${videoTitle.substring(0, 35)}" | Müzik: "${musicTitle.substring(0, 35)}" | Süre: ${duration}s | Skor: ${score}`);

    const playUrl = video.music || video.music_info?.play;
    if (!playUrl) continue;

    if (score > bestScore) {
      bestScore = score;
      bestVideo = video;
    }
  }

  if (!bestVideo) return null;

  const playUrl = bestVideo.music || bestVideo.music_info?.play;
  const authorUniqueId = bestVideo.author?.unique_id || "tiktok";
  const videoId = bestVideo.video_id;
  const videoUrl = `https://www.tiktok.com/@${authorUniqueId}/video/${videoId}`;

  return {
    playUrl,
    videoUrl
  };
}
