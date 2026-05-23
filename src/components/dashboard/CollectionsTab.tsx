import React from "react";
import { Plus, ListPlus, Trash2, Pause, Play, Loader2, Heart } from "lucide-react";
import Button from "../ui/button";
import { Card } from "../ui/card";
import { SpotifyTrack } from "@/app/actions/spotify";
import { DBCollection } from "@/app/actions/database";
import { TikTokIcon, InstagramIcon } from "../icons/BrandIcons";

interface CollectionsTabProps {
  setIsCreateCollectionOpen: (open: boolean) => void;
  collections: DBCollection[];
  handleDeleteCollection: (collId: string) => void;
  currentTrack: SpotifyTrack | null;
  isPlaying: boolean;
  resolvedCache: Record<string, any>;
  playTrack: (track: SpotifyTrack) => void;
  handleAutoResolveTikTok: (track: any) => void;
  resolvingTrackId: string | null;
  handleAutoResolveInstagram: (track: any) => void;
  resolvingInstagramTrackId: string | null;
  handleToggleFavorite: (track: SpotifyTrack) => void;
  isFavorite: (trackId: string) => boolean;
  handleRemoveTrackFromCollection: (collId: string, spotifyId: string) => void;
}

export default function CollectionsTab({
  setIsCreateCollectionOpen,
  collections,
  handleDeleteCollection,
  currentTrack,
  isPlaying,
  resolvedCache,
  playTrack,
  handleAutoResolveTikTok,
  resolvingTrackId,
  handleAutoResolveInstagram,
  resolvingInstagramTrackId,
  handleToggleFavorite,
  isFavorite,
  handleRemoveTrackFromCollection
}: CollectionsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">Özel Müzik Koleksiyonlarım</h3>
          <p className="text-xs text-gray-400 mt-1">İçerik üreteceğiniz, videolarınızda kullanacağınız şarkı grupları oluşturun</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setIsCreateCollectionOpen(true)}
          className="flex items-center gap-2 cursor-pointer"
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
          <Button variant="secondary" onClick={() => setIsCreateCollectionOpen(true)} className="cursor-pointer">
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
                  className="h-9 w-9 text-gray-400 hover:text-red-500 hover:bg-white/5 cursor-pointer"
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
                      customPreviewUrl: t.customPreviewUrl || resolvedCache[t.spotifyId]?.customPreviewUrl || undefined,
                      tiktokVideoUrl: t.tiktokVideoUrl || resolvedCache[t.spotifyId]?.tiktokVideoUrl || undefined,
                      instagramAudioUrl: (t as any).instagramAudioUrl || resolvedCache[t.spotifyId]?.instagramAudioUrl || undefined,
                      instagramVideoUrl: (t as any).instagramVideoUrl || resolvedCache[t.spotifyId]?.instagramVideoUrl || undefined,
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
                          className="h-8 w-8 bg-white/5 border border-white/10 text-white rounded-full flex items-center justify-center hover:bg-primary hover:border-primary active:scale-90 transition-all shrink-0 cursor-pointer"
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
                            className={`h-8.5 w-8.5 rounded-xl transition-all duration-300 relative overflow-hidden border cursor-pointer ${
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
                            className={`h-8.5 w-8.5 rounded-xl transition-all duration-300 relative overflow-hidden border cursor-pointer ${
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
                            className={`h-8 w-8 cursor-pointer ${
                              isFavorite(t.spotifyId) ? "text-red-500" : "text-gray-400"
                            }`}
                          >
                            <Heart className="h-3.5 w-3.5" fill={isFavorite(t.spotifyId) ? "currentColor" : "none"} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveTrackFromCollection(coll.id, t.spotifyId)}
                            className="h-8 w-8 text-gray-400 hover:text-red-500 cursor-pointer"
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
  );
}
