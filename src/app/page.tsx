import { auth } from "@/auth";
import Dashboard from "@/components/Dashboard";

// Sayfa Başlığı ve Meta veriler (SEO)
export const metadata = {
  title: "ViralSound Hub - Tiktok Trendlerini Spotify Kalitesiyle Dinleyin",
  description:
    "TikTok üzerinde viral olan şarkı nakaratlarını Spotify yüksek ses kalitesiyle keşfedin, özel koleksiyonlar oluşturun ve favorilerinize kaydedin.",
};

export default async function Home() {
  const session = await auth().catch(() => null);

  return (
    <main className="flex-1 flex flex-col min-h-screen">
      <Dashboard initialSession={session} />
    </main>
  );
}
