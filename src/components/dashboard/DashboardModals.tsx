import React from "react";
import { Loader2 } from "lucide-react";
import Button from "../ui/button";
import Input from "../ui/input";
import Dialog from "../ui/dialog";
import { SpotifyTrack } from "@/app/actions/spotify";
import { DBCollection } from "@/app/actions/database";

interface DashboardModalsProps {
  isLoginOpen: boolean;
  setIsLoginOpen: (open: boolean) => void;
  loginEmail: string;
  setLoginEmail: (val: string) => void;
  loginUsername: string;
  setLoginUsername: (val: string) => void;
  handleLoginSubmit: (e: React.FormEvent) => void;
  
  isCreateCollectionOpen: boolean;
  setIsCreateCollectionOpen: (open: boolean) => void;
  newCollName: string;
  setNewCollName: (val: string) => void;
  newCollDesc: string;
  setNewCollDesc: (val: string) => void;
  handleCreateCollection: () => void;
  
  isAddToCollectionOpen: boolean;
  setIsAddToCollectionOpen: (open: boolean) => void;
  selectedTrackToAddToCollection: any;
  setSelectedTrackToAddToCollection: (track: any) => void;
  collections: DBCollection[];
  handleAddTrackToCollection: (collId: string) => void;
  
  isTikTokResolverOpen: boolean;
  setIsTikTokResolverOpen: (open: boolean) => void;
  tiktokInputUrl: string;
  setTiktokInputUrl: (val: string) => void;
  setSelectedTrackForTikTok: (track: any) => void;
  tiktokResolveError: string;
  setTiktokResolveError: (val: string) => void;
  resolvingTikTok: boolean;
  handleResolveTikTokAudio: () => void;
}

export default function DashboardModals({
  isLoginOpen,
  setIsLoginOpen,
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
  setIsAddToCollectionOpen,
  selectedTrackToAddToCollection,
  setSelectedTrackToAddToCollection,
  collections,
  handleAddTrackToCollection,
  
  isTikTokResolverOpen,
  setIsTikTokResolverOpen,
  tiktokInputUrl,
  setTiktokInputUrl,
  setSelectedTrackForTikTok,
  tiktokResolveError,
  setTiktokResolveError,
  resolvingTikTok,
  handleResolveTikTokAudio
}: DashboardModalsProps) {
  return (
    <>
      {/* 1. GİRİŞ YAP MODALI */}
      <Dialog isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} title="Hit Music'e Giriş Yap">
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
              placeholder="Youtube Shorts ve Reels videolarımda kullanacağım pop-rock nakaratlar..."
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
            <p>İş <strong>Nasıl Yapılır?</strong></p>
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
                "Sesi Öz ve Aktar"
              )}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
