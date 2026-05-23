import React from "react";
import { Music, Pause, Play, VolumeX, Volume2, ExternalLink } from "lucide-react";
import { SpotifyTrack } from "@/app/actions/spotify";
import { TikTokIcon, InstagramIcon } from "../icons/BrandIcons";

interface FloatingPlayerProps {
  currentTrack: SpotifyTrack;
  isPlaying: boolean;
  audioSourceMode: "spotify" | "tiktok" | "instagram";
  activeTab: string;
  playTrack: (track: SpotifyTrack, source?: "spotify" | "tiktok" | "instagram") => void;
  handleAutoResolveTikTok: (track: any) => Promise<any>;
  handleAutoResolveInstagram: (track: any) => Promise<any>;
  currentTime: number;
  duration: number;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  setIsMuted: (m: boolean) => void;
  formatTime: (time: number) => string;
  progressRef: React.RefObject<HTMLDivElement | null>;
  handleProgressBarClick: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export default function FloatingPlayer({
  currentTrack,
  isPlaying,
  audioSourceMode,
  activeTab,
  playTrack,
  handleAutoResolveTikTok,
  handleAutoResolveInstagram,
  currentTime,
  duration,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  formatTime,
  progressRef,
  handleProgressBarClick
}: FloatingPlayerProps) {
  // activeTab'e göre tip belirleme yardımcı fonksiyonu
  const getTrackType = () => {
    return activeTab === "discover" ? "discover" : activeTab === "favorites" ? "favorite" : "collection";
  };

  return (
    <div className="fixed bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 w-[94%] max-w-7xl z-50 rounded-2xl border border-white/10 bg-[#06050b]/85 backdrop-blur-xl px-6 py-3 md:py-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_25px_60px_rgba(0,0,0,0.8),0_0_40px_rgba(168,85,247,0.12)] hover:border-white/15 transition-all duration-300">
      {/* Sol: Şarkı Ayrıntıları */}
      <div className="w-full md:w-1/4 flex items-center gap-4.5 shrink-0">
        <div className={`relative h-14 w-14 rounded-xl overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.5)] shrink-0 group border border-white/10 transition-all duration-500 ${
          isPlaying ? "shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.03]" : ""
        }`}>
          <img
            src={currentTrack.albumArt}
            alt={currentTrack.title}
            className={`h-full w-full object-cover rounded-xl transition-transform duration-500 ${
              isPlaying ? "animate-[spin_12s_linear_infinite]" : ""
            }`}
          />
          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Music className="h-5 w-5 text-white animate-pulse" />
          </div>
        </div>
        <div className="min-w-0 flex flex-col gap-1">
          <div className="flex items-center flex-wrap gap-2">
            <h4 className="font-black text-white text-sm tracking-tight truncate select-none font-sans">
              {currentTrack.title}
            </h4>
            {audioSourceMode === "tiktok" && (
              <span className="shrink-0 px-2 py-0.5 text-[8px] font-black rounded-md bg-gradient-to-r from-[#ff0050] to-[#00f2fe] text-white animate-pulse shadow-[0_0_10px_rgba(255,0,80,0.6)] tracking-wider">
                TIKTOK SESİ
              </span>
            )}
            {audioSourceMode === "instagram" && (
              <span className="shrink-0 px-2 py-0.5 text-[8px] font-black rounded-md bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white animate-pulse shadow-[0_0_10px_rgba(253,29,29,0.6)] tracking-wider">
                REELS SESİ
              </span>
            )}
            {audioSourceMode === "spotify" && (
              <span className="shrink-0 px-2 py-0.5 text-[8px] font-black rounded-md bg-[#1DB954] text-white shadow-[0_0_10px_rgba(29,185,84,0.6)] tracking-wider">
                STUDIO SESİ
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 font-bold tracking-wide truncate select-none uppercase">{currentTrack.artist}</p>
        </div>
      </div>

      {/* Orta: Çalma Kontrolleri & İlerleme */}
      <div className="w-full md:w-2/4 flex flex-col items-center gap-2">
        {/* Üst Sıra: Ses Kaynak Seçici Panel & Play/Pause */}
        <div className="flex items-center justify-between w-full max-w-md gap-4">
          {/* Sol Taraf: Ses Kaynağı Seçici Panel */}
          <div className="flex items-center gap-1 bg-white/5 border border-white/5 p-0.5 rounded-xl">
            <button
              onClick={() => playTrack(currentTrack, "spotify")}
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1 cursor-pointer ${
                audioSourceMode === "spotify"
                  ? "bg-[#1DB954] text-white shadow-[0_2px_8px_rgba(29,185,84,0.3)] scale-[1.02]"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Studio
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
                    type: getTrackType(),
                    albumArt: currentTrack.albumArt,
                    previewUrl: currentTrack.previewUrl
                  });
                }
              }}
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                audioSourceMode === "tiktok"
                  ? "bg-[#ff0050] text-white shadow-[0_2px_8px_rgba(255,0,80,0.3)] scale-[1.02]"
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
                    type: getTrackType(),
                    albumArt: currentTrack.albumArt,
                    previewUrl: currentTrack.previewUrl
                  });
                }
              }}
              className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 cursor-pointer ${
                audioSourceMode === "instagram"
                  ? "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow-[0_2px_8px_rgba(253,29,29,0.3)] scale-[1.02]"
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

          {/* Hepsi Bir Arada Çalma ve Ritim Dalgaları */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Dans Eden Dalga Animasyonu */}
            {isPlaying && (
              <div className="hidden sm:flex items-center gap-[3px] h-5 px-2 bg-white/5 border border-white/5 rounded-lg shrink-0">
                <span className="w-[2px] bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s", height: "40%" }} />
                <span className="w-[2px] bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.5s", height: "80%" }} />
                <span className="w-[2px] bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.2s", height: "30%" }} />
                <span className="w-[2px] bg-tiktok rounded-full animate-music-bar" style={{ animationDelay: "0.7s", height: "90%" }} />
                <span className="w-[2px] bg-purple-500 rounded-full animate-music-bar" style={{ animationDelay: "0.4s", height: "50%" }} />
              </div>
            )}

            <button
              onClick={() => playTrack(currentTrack)}
              className="h-10 w-10 bg-gradient-to-tr from-[#ff0050] via-[#a855f7] to-[#00f2fe] text-white rounded-xl flex items-center justify-center active:scale-95 hover:scale-105 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.5)] cursor-pointer"
            >
              {isPlaying ? <Pause className="h-4.5 w-4.5 fill-white" /> : <Play className="h-4.5 w-4.5 fill-white translate-x-[1px]" />}
            </button>
          </div>
        </div>

        {/* İlerleme Çubuğu */}
        <div className="w-full flex items-center gap-2.5 px-2">
          <span className="text-[9px] text-gray-400 font-black tracking-widest select-none">
            {formatTime(currentTime)}
          </span>
          <div
            ref={progressRef}
            onClick={handleProgressBarClick}
            className="flex-1 h-1 bg-white/10 hover:h-1.5 rounded-full relative cursor-pointer group transition-all"
          >
            {/* Glow Efektli İlerleme Çizgisi */}
            <div
              className="h-full bg-gradient-to-r from-[#ff0050] via-[#a855f7] to-[#00f2fe] rounded-full relative transition-all duration-75 shadow-[0_0_10px_rgba(168,85,247,0.6)]"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity border border-primary pointer-events-none shadow-[0_0_8px_rgba(255,255,255,0.8)]"
              style={{ left: `calc(${(currentTime / duration) * 100}% - 6px)` }}
            />
          </div>
          <span className="text-[9px] text-gray-400 font-black tracking-widest select-none">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      {/* Sağ: Ses Seviyesi & Tiktok Redirect */}
      <div className="w-full md:w-1/4 flex items-center justify-end gap-4 shrink-0">
        {/* TikTok Redirect Button */}
        <a
          href={currentTrack.tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-4.5 py-2 text-[10px] font-black bg-gradient-to-r from-[#ff0050] to-[#e00045] text-white hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(255,0,80,0.3)] hover:shadow-[0_0_20px_rgba(255,0,80,0.6)] transition-all uppercase tracking-wider shrink-0 cursor-pointer rounded-xl"
        >
          TikTok'ta Gör <ExternalLink className="h-3 w-3 shrink-0" />
        </a>

        {/* Ses Seviyesi */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/5 px-3 py-1.5 rounded-xl">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            {isMuted || volume === 0 ? <VolumeX className="h-4 w-4 text-red-500" /> : <Volume2 className="h-4 w-4" />}
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
  );
}
