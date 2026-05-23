import React from "react";
import { Loader2, Sparkles, Pause, Play, Heart, Plus, Disc } from "lucide-react";
import Button from "../ui/button";
import { SpotifyTrack } from "@/app/actions/spotify";
import { TikTokIcon } from "../icons/BrandIcons";

interface RouletteTabProps {
  spinning: boolean;
  rouletteTrack: SpotifyTrack | null;
  rouletteError: string;
  selectedLanguage: "all" | "tr" | "global";
  setSelectedLanguage: (lang: "all" | "tr" | "global") => void;
  selectedGenre: "all" | "pop" | "rap" | "rock" | "dance" | "r&b";
  setSelectedGenre: (genre: "all" | "pop" | "rap" | "rock" | "dance" | "r&b") => void;
  handleSpinRoulette: () => void;
  playTrack: (track: SpotifyTrack) => void;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  resolvingRouletteTikTok: boolean;
  handleToggleFavorite: (track: SpotifyTrack) => void;
  isFavorite: (trackId: string) => boolean;
  session: any;
  setIsLoginOpen: (open: boolean) => void;
  setSelectedTrackToAddToCollection: (track: SpotifyTrack | null) => void;
  setIsAddToCollectionOpen: (open: boolean) => void;
}

export default function RouletteTab({
  spinning,
  rouletteTrack,
  rouletteError,
  selectedLanguage,
  setSelectedLanguage,
  selectedGenre,
  setSelectedGenre,
  handleSpinRoulette,
  playTrack,
  isPlaying,
  currentTrack,
  resolvingRouletteTikTok,
  handleToggleFavorite,
  isFavorite,
  session,
  setIsLoginOpen,
  setSelectedTrackToAddToCollection,
  setIsAddToCollectionOpen
}: RouletteTabProps) {
  return (
    <div className="flex flex-col items-center gap-8 py-4 w-full">
      <div className="text-center max-w-xl flex flex-col gap-2.5 animate-[fadeIn_0.5s_ease-out] px-4">
        <span className="self-center text-xs font-black tracking-widest text-[#ff0050] uppercase bg-[#ff0050]/10 px-3.5 py-1.5 rounded-full border border-[#ff0050]/20 flex items-center gap-1.5 shadow-[0_0_15px_rgba(255,0,80,0.15)]">
          <Sparkles className="h-3.5 w-3.5 text-[#ff0050] animate-pulse" /> ŞANSINI DENE
        </span>
        <h3 className="text-3xl md:text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white via-gray-100 to-gray-400 text-transparent bg-clip-text">
          Viral Hits Roulette
        </h3>
        <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
          Sosyal medyanın en popüler hit şarkılarından oluşan özel havuzumuzdan rastgele bir şarkı çekin. Orijinal Spotify kalitesinde çalar, isterseniz TikTok/Instagram seslerini de anında çözebilirsiniz!
        </p>
      </div>

      {/* Kontrol Paneli Kartı */}
      <div className="w-[94%] max-w-xl bg-white/5 border border-white/10 rounded-3xl p-5 md:p-6 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.4)] animate-[slideUp_0.4s_ease-out] flex flex-col gap-5">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Dil Seçimi */}
          <div className="flex-1 flex flex-col gap-2 w-full">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center md:text-left select-none">Dil Seçimi</span>
            <div className="grid grid-cols-3 gap-1 bg-white/3 border border-white/5 p-1 rounded-xl">
              <button
                onClick={() => setSelectedLanguage("all")}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                  selectedLanguage === "all"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)] font-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Hepsi
              </button>
              <button
                onClick={() => setSelectedLanguage("tr")}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                  selectedLanguage === "tr"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)] font-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Türkçe
              </button>
              <button
                onClick={() => setSelectedLanguage("global")}
                className={`py-1.5 rounded-lg text-xs font-bold transition-all duration-300 cursor-pointer ${
                  selectedLanguage === "global"
                    ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)] font-black"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Yabancı
              </button>
            </div>
          </div>

          {/* Müzik Türü Filtresi */}
          <div className="flex-1 flex flex-col gap-2 min-w-0 w-full">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center md:text-left select-none">Müzik Türü</span>
            <div className="grid grid-cols-6 gap-1 bg-white/3 border border-white/5 p-1 rounded-xl">
              {(["all", "pop", "rap", "rock", "dance", "r&b"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`py-1.5 rounded-lg text-[10px] font-black transition-all duration-300 cursor-pointer uppercase ${
                    selectedGenre === g
                      ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-[0_4px_12px_rgba(168,85,247,0.3)]"
                      : "text-gray-500 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {g === "all" ? "HPS" : g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Premium Pikap & Dönen Plak Arayüzü */}
      <div className="relative flex items-center justify-center p-6 select-none bg-black/25 border border-white/5 rounded-3xl shadow-[inset_0_0_20px_rgba(0,0,0,0.6)]">
        {/* Plak Dışındaki Parlama Halkası */}
        <div className={`absolute rounded-full blur-3xl opacity-20 transition-all duration-1000 ${
          spinning 
            ? "bg-gradient-to-tr from-[#ff0050] via-[#a855f7] to-[#00f2fe] scale-120 opacity-50 animate-pulse" 
            : isPlaying && currentTrack?.id === rouletteTrack?.id
              ? "bg-gradient-to-tr from-[#ff0050] to-[#a855f7] scale-110 opacity-35 animate-pulse"
              : "bg-white/5"
        }`} style={{ width: "260px", height: "260px" }} />

        {/* Dış Daire (Pikap Kasası) */}
        <div className="relative p-6 bg-gradient-to-b from-[#18181b] to-[#09090b] rounded-[36px] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_2px_4px_rgba(255,255,255,0.05)] flex items-center justify-center animate-[fadeIn_0.7s_ease-out]">
          
          {/* Pikap Kolu (Stylus / Tonearm) - WOW Etkisi! */}
          <div 
            className="absolute -top-3 right-3 w-28 h-36 pointer-events-none z-20 origin-[20px_20px] transition-transform duration-1000 ease-in-out" 
            style={{
              transform: spinning || (isPlaying && currentTrack?.id === rouletteTrack?.id)
                ? "rotate(24deg)"
                : "rotate(0deg)"
            }}
          >
            <svg viewBox="0 0 100 150" className="w-full h-full drop-shadow-[0_8px_16px_rgba(0,0,0,0.7)]">
              {/* Döner taban */}
              <circle cx="20" cy="20" r="14" fill="#2d2d30" stroke="#3f3f46" strokeWidth="2.5" />
              <circle cx="20" cy="20" r="6" fill="#09090b" />
              {/* Metal kol */}
              <path d="M20 20 Q 30 65, 45 95 T 50 135" fill="none" stroke="#a1a1aa" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M20 20 Q 30 65, 45 95 T 50 135" fill="none" stroke="#e4e4e7" strokeWidth="1.5" strokeLinecap="round" />
              {/* İğne başlığı (Cartridge) */}
              <rect x="42" y="130" width="16" height="20" rx="3.5" fill="#ff0050" transform="rotate(-15 50 140)" />
              {/* Küçük ağırlık */}
              <rect x="12" y="4" width="16" height="10" rx="1.5" fill="#52525b" />
            </svg>
          </div>

          {/* Plak Gövdesi */}
          <div 
            className={`relative w-48 h-48 sm:w-60 sm:h-60 rounded-full bg-gradient-to-b from-[#141416] via-[#09090a] to-[#040404] border-8 border-[#1f1f23] shadow-[0_0_30px_rgba(0,0,0,0.9),inset_0_0_15px_rgba(0,0,0,1)] flex items-center justify-center overflow-hidden transition-transform duration-500 ${
              spinning 
                ? "animate-[spin_1s_linear_infinite]" 
                : isPlaying && currentTrack?.id === rouletteTrack?.id
                  ? "animate-[spin_12s_linear_infinite]"
                  : ""
            }`}
          >
            {/* Plak Gerçekçi Parlama Efekti (Reflective Glare) */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/3 to-transparent opacity-60 pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/3 to-transparent opacity-60 pointer-events-none" />

            {/* Plak Kanalları (Vinil Çizgileri) */}
            <div className="absolute inset-2 rounded-full border border-white/5 opacity-40 pointer-events-none" />
            <div className="absolute inset-6 rounded-full border border-white/5 opacity-30 pointer-events-none" />
            <div className="absolute inset-12 rounded-full border border-white/5 opacity-25 pointer-events-none" />
            <div className="absolute inset-18 rounded-full border border-white/5 opacity-20 pointer-events-none" />
            <div className="absolute inset-24 rounded-full border border-white/5 opacity-15 pointer-events-none" />
            <div className="absolute inset-30 rounded-full border border-white/5 opacity-10 pointer-events-none" />

            {/* Plak Ortasındaki Etiket (Label) */}
            <div className="absolute w-20 h-20 sm:w-26 sm:h-26 rounded-full bg-[#18181b] border-2 border-white/10 flex items-center justify-center overflow-hidden z-10 shadow-[0_0_15px_rgba(0,0,0,0.6)]">
              {rouletteTrack ? (
                <img 
                  src={rouletteTrack.albumArt} 
                  alt={rouletteTrack.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-[#ff0050]/20 to-[#a855f7]/20 flex items-center justify-center">
                  <Disc className={`h-10 w-10 text-gray-500 ${spinning ? "animate-pulse" : ""}`} />
                </div>
              )}
              {/* Merkez Delik */}
              <div className="w-4 h-4 rounded-full bg-[#09090b] border-2 border-white/10 shadow-[inner_0_0_5px_rgba(0,0,0,1)] z-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Neon Spin Butonu */}
      <div className="flex flex-col items-center gap-4 animate-[fadeIn_0.8s_ease-out]">
        <Button
          onClick={handleSpinRoulette}
          disabled={spinning}
          className={`px-10 py-4.5 rounded-2xl text-sm font-black uppercase tracking-widest border transition-all duration-300 flex items-center gap-2.5 cursor-pointer hover:-translate-y-0.5 active:translate-y-0 ${
            spinning
              ? "bg-gray-800 text-gray-500 cursor-not-allowed border-transparent shadow-none"
              : "bg-gradient-to-r from-[#ff0050] via-[#a855f7] to-[#00f2fe] text-white border-transparent hover:scale-105 active:scale-95 shadow-[0_0_25px_rgba(255,0,80,0.4)] hover:shadow-[0_0_40px_rgba(0,242,254,0.7)]"
          }`}
        >
          {spinning ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Rulet Dönüyor...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 animate-pulse" /> Çevir & Keşfet
            </span>
          )}
        </Button>

        {rouletteError && (
          <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-4.5 py-2.5 rounded-full mt-2 animate-bounce">
            {rouletteError}
          </p>
        )}
      </div>

      {/* Kazanan Şarkı Premium Cam Kartı */}
      {rouletteTrack && !spinning && (
        <div className="w-[94%] max-w-xl bg-gradient-to-b from-white/5 via-white/2 to-transparent border border-[#ff0050]/30 rounded-3xl p-5 flex flex-col sm:flex-row items-center gap-5 shadow-[0_15px_40px_rgba(255,0,80,0.15)] animate-[slideUp_0.5s_ease-out] relative overflow-hidden">
          {/* Arka Plan Glow Parıltısı */}
          <div className="absolute -top-10 -left-10 w-36 h-36 bg-[#ff0050]/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -right-10 w-36 h-36 bg-[#a855f7]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Sol Taraf: Albüm Resmi ve Play Buton */}
          <div className="relative h-24 w-24 rounded-2xl overflow-hidden shadow-2xl shrink-0 group border border-white/10 bg-black/20">
            <img
              src={rouletteTrack.albumArt}
              alt={rouletteTrack.title}
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-black/45 backdrop-blur-[1.5px] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
              <button
                onClick={() => playTrack(rouletteTrack)}
                className="h-11 w-11 bg-gradient-to-r from-[#ff0050] to-[#a855f7] text-white rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-[0_0_12px_rgba(255,0,80,0.5)]"
              >
                {isPlaying && currentTrack?.id === rouletteTrack.id ? (
                  <Pause className="h-4.5 w-4.5 fill-white" />
                ) : (
                  <Play className="h-4.5 w-4.5 fill-white translate-x-[1px]" />
                )}
              </button>
            </div>
            {isPlaying && currentTrack?.id === rouletteTrack.id && (
              <div className="absolute inset-0 bg-black/45 flex items-center justify-center gap-[3px]">
                <span className="w-0.75 h-6 bg-primary rounded-full animate-music-bar" style={{ animationDelay: "0.1s" }} />
                <span className="w-0.75 h-6 bg-cyan-glow rounded-full animate-music-bar" style={{ animationDelay: "0.3s" }} />
                <span className="w-0.75 h-6 bg-spotify rounded-full animate-music-bar" style={{ animationDelay: "0.5s" }} />
              </div>
            )}
          </div>

          {/* Sağ Taraf: Metadatalar ve Aksiyon Butonları */}
          <div className="flex-1 flex flex-col justify-between w-full gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-gradient-to-r from-[#ff0050] to-[#a855f7] text-white animate-pulse shadow-[0_0_8px_rgba(255,0,80,0.3)] uppercase tracking-wider">
                  KAZANAN ŞARKI
                </span>
                {resolvingRouletteTikTok && (
                  <span className="px-2 py-0.5 text-[8px] font-bold rounded-full bg-white/5 border border-white/10 text-cyan-glow flex items-center gap-1">
                    <Loader2 className="h-2 w-2 animate-spin" /> TikTok Çözülüyor
                  </span>
                )}
                {!resolvingRouletteTikTok && rouletteTrack.customPreviewUrl && (
                  <span className="px-2 py-0.5 text-[8px] font-black rounded-full bg-[#ff0050]/20 border border-[#ff0050]/40 text-[#ff0050] flex items-center gap-1 animate-pulse-glow">
                    <TikTokIcon className="h-2.5 w-2.5" /> TikTok Sesi Aktif!
                  </span>
                )}
              </div>
              <h4 className="font-extrabold text-white text-base leading-snug whitespace-normal break-words">
                {rouletteTrack.title}
              </h4>
              <p className="text-xs text-gray-400 mt-0.5 leading-none">{rouletteTrack.artist}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
              {/* Oynat / Durdur */}
              <Button
                variant="primary"
                onClick={() => playTrack(rouletteTrack)}
                className="px-3.5 py-2 text-[10px] font-black tracking-wider uppercase flex items-center gap-1"
              >
                {isPlaying && currentTrack?.id === rouletteTrack.id ? (
                  <>
                    <Pause className="h-3 w-3" /> Durdur
                  </>
                ) : (
                  <>
                    <Play className="h-3 w-3 translate-x-[0.5px]" /> Dinle
                  </>
                )}
              </Button>

              {/* Favori Butonu */}
              <Button
                variant="ghost"
                onClick={() => handleToggleFavorite(rouletteTrack)}
                className={`h-8 px-2.5 rounded-xl border border-white/10 flex items-center gap-1 text-[10px] font-bold ${
                  isFavorite(rouletteTrack.id) ? "text-red-500 bg-red-500/10 border-red-500/20" : "text-gray-300 hover:text-white hover:bg-white/5"
                }`}
              >
                <Heart className="h-3 w-3" fill={isFavorite(rouletteTrack.id) ? "currentColor" : "none"} />
                {isFavorite(rouletteTrack.id) ? "Favorilerde" : "Favori"}
              </Button>

              {/* Koleksiyona Ekle Butonu */}
              <Button
                variant="ghost"
                onClick={() => {
                  if (!session) {
                    setIsLoginOpen(true);
                    return;
                  }
                  setSelectedTrackToAddToCollection(rouletteTrack);
                  setIsAddToCollectionOpen(true);
                }}
                className="h-8 px-2.5 rounded-xl border border-white/10 flex items-center gap-1 text-[10px] font-bold text-gray-300 hover:text-white hover:bg-white/5"
              >
                <Plus className="h-3 w-3" />
                Koleksiyon
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
