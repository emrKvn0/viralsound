import React from "react";
import { Heart, Compass, Pause, Play, Loader2 } from "lucide-react";
import Button from "../ui/button";
import { Card } from "../ui/card";
import { SpotifyTrack } from "@/app/actions/spotify";
import { DBFavorite } from "@/app/actions/database";
import { TikTokIcon, InstagramIcon } from "../icons/BrandIcons";

interface FavoritesTabProps {
  favorites: DBFavorite[];
  resolvedCache: Record<string, any>;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  playTrack: (track: SpotifyTrack) => void;
  handleAutoResolveTikTok: (track: any) => void;
  resolvingTrackId: string | null;
  handleAutoResolveInstagram: (track: any) => void;
  resolvingInstagramTrackId: string | null;
  handleToggleFavorite: (track: SpotifyTrack) => void;
  setActiveTab: (tab: "discover" | "collections" | "favorites" | "roulette") => void;
}

export default function FavoritesTab({
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
  setActiveTab
}: FavoritesTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-xl font-bold text-white">Favori Şarkılarım</h3>
        <p className="text-xs text-gray-400 mt-1">Entegre ettiğiniz TikTok sesleri ve beğendiğiniz tüm hit şarkılar</p>
      </div>

      {favorites.length === 0 ? (
        <div className="glass-panel rounded-2xl py-20 text-center text-gray-400 flex flex-col items-center justify-center gap-4">
          <Heart className="h-14 w-14 text-gray-500" />
          <div>
            <p className="text-sm font-semibold">Henüz favori şarkınız bulunmuyor.</p>
            <p className="text-xs text-gray-500 mt-1">TikTok seslerini çözdüğünüz veya beğendiğiniz şarkıları favoriye ekleyerek burada listeleyebilirsiniz.</p>
          </div>
          <Button variant="secondary" onClick={() => setActiveTab("discover")} className="flex items-center gap-2 cursor-pointer">
            <Compass className="h-4 w-4" /> Trend Şarkıları Keşfet
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((fav) => {
            // SpotifyTrack'e dönüştür
            const formatTrack: SpotifyTrack = {
              id: fav.spotifyId,
              title: fav.title,
              artist: fav.artist,
              albumArt: fav.albumArt || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?q=80&w=400&auto=format&fit=crop",
              previewUrl: fav.previewUrl,
              customPreviewUrl: fav.customPreviewUrl || resolvedCache[fav.spotifyId]?.customPreviewUrl || undefined,
              tiktokVideoUrl: fav.tiktokVideoUrl || resolvedCache[fav.spotifyId]?.tiktokVideoUrl || undefined,
              instagramAudioUrl: (fav as any).instagramAudioUrl || resolvedCache[fav.spotifyId]?.instagramAudioUrl || undefined,
              instagramVideoUrl: (fav as any).instagramVideoUrl || resolvedCache[fav.spotifyId]?.instagramVideoUrl || undefined,
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
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
                      <button
                        onClick={() => playTrack(formatTrack)}
                        className="h-8 w-8 bg-primary text-white rounded-full flex items-center justify-center cursor-pointer"
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
                      className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border cursor-pointer ${
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
                      className={`h-9 w-9 rounded-xl transition-all duration-300 relative overflow-hidden border cursor-pointer ${
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
                      className="h-8 w-8 text-red-500 hover:bg-white/5 cursor-pointer"
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
  );
}
