"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface DBTrack {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  albumArt?: string;
  previewUrl: string;
  customPreviewUrl?: string | null;
  tiktokVideoUrl?: string | null;
  instagramAudioUrl?: string | null;
  instagramVideoUrl?: string | null;
}

export interface DBCollection {
  id: string;
  name: string;
  description?: string | null;
  tracks: DBTrack[];
  createdAt: Date;
}

export interface DBFavorite {
  id: string;
  spotifyId: string;
  title: string;
  artist: string;
  albumArt?: string | null;
  previewUrl: string;
  customPreviewUrl?: string | null;
  tiktokVideoUrl?: string | null;
  instagramAudioUrl?: string | null;
  instagramVideoUrl?: string | null;
  createdAt: Date;
}

// Veritabanı bağlantısını kontrol eden yardımcı fonksiyon
async function checkDbConnected(): Promise<boolean> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes("xxxxxx")) {
    return false;
  }
  try {
    // Kısa bir sorgu ile Neon bağlantısını doğrula
    await db.$executeRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.warn("Neon veritabanına bağlanılamadı, yerel depolama simülasyonu kullanılacak.", error);
    return false;
  }
}

export async function isDbConnected(): Promise<boolean> {
  return await checkDbConnected();
}

// === KOLEKSİYONLAR (PLAYLISTS) ===

export async function getCollections(userId: string): Promise<DBCollection[]> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) return [];

  try {
    const collections = await db.collection.findMany({
      where: { userId },
      include: { tracks: true },
      orderBy: { createdAt: "desc" },
    });
    return collections as DBCollection[];
  } catch (error) {
    console.error("Koleksiyonları getirme hatası:", error);
    return [];
  }
}

export async function createCollection(
  userId: string,
  name: string,
  description?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    const collection = await db.collection.create({
      data: {
        userId,
        name,
        description,
      },
    });
    revalidatePath("/");
    return { success: true, data: collection };
  } catch (error: any) {
    console.error("Koleksiyon oluşturma hatası:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteCollection(
  collectionId: string
): Promise<{ success: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    await db.collection.delete({
      where: { id: collectionId },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Koleksiyon silme hatası:", error);
    return { success: false, error: error.message };
  }
}

export async function addTrackToCollection(
  collectionId: string,
  track: Omit<DBTrack, "id">
): Promise<{ success: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    // Şarkı veritabanında zaten var mı kontrol et
    let dbTrack = await db.track.findFirst({
      where: { spotifyId: track.spotifyId },
    });

    // Yoksa oluştur
    if (!dbTrack) {
      dbTrack = await db.track.create({
        data: {
          spotifyId: track.spotifyId,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt || "",
          previewUrl: track.previewUrl,
          customPreviewUrl: track.customPreviewUrl || null,
          tiktokVideoUrl: track.tiktokVideoUrl || null,
          instagramAudioUrl: track.instagramAudioUrl || null,
          instagramVideoUrl: track.instagramVideoUrl || null,
        },
      });
    }

    // Koleksiyona ekle (ilişkilendir)
    await db.collection.update({
      where: { id: collectionId },
      data: {
        tracks: {
          connect: { id: dbTrack.id },
        },
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Koleksiyona şarkı ekleme hatası:", error);
    return { success: false, error: error.message };
  }
}

export async function removeTrackFromCollection(
  collectionId: string,
  spotifyId: string
): Promise<{ success: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    const dbTrack = await db.track.findFirst({
      where: { spotifyId },
    });

    if (!dbTrack) {
      return { success: false, error: "Şarkı bulunamadı" };
    }

    await db.collection.update({
      where: { id: collectionId },
      data: {
        tracks: {
          disconnect: { id: dbTrack.id },
        },
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Koleksiyondan şarkı çıkarma hatası:", error);
    return { success: false, error: error.message };
  }
}

// === FAVORİLER ===

export async function getFavorites(userId: string): Promise<DBFavorite[]> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) return [];

  try {
    const favorites = await db.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return favorites as DBFavorite[];
  } catch (error) {
    console.error("Favorileri getirme hatası:", error);
    return [];
  }
}

export async function toggleFavorite(
  userId: string,
  track: Omit<DBTrack, "id">
): Promise<{ success: boolean; isFavorite: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, isFavorite: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    // Zaten favorilerde mi kontrol et
    const existing = await db.favorite.findFirst({
      where: {
        userId,
        spotifyId: track.spotifyId,
      },
    });

    if (existing) {
      // Favorilerden kaldır
      await db.favorite.delete({
        where: { id: existing.id },
      });
      revalidatePath("/");
      return { success: true, isFavorite: false };
    } else {
      // Favorilere ekle
      await db.favorite.create({
        data: {
          userId,
          spotifyId: track.spotifyId,
          title: track.title,
          artist: track.artist,
          albumArt: track.albumArt || "",
          previewUrl: track.previewUrl,
          customPreviewUrl: track.customPreviewUrl || null,
          tiktokVideoUrl: track.tiktokVideoUrl || null,
          instagramAudioUrl: track.instagramAudioUrl || null,
          instagramVideoUrl: track.instagramVideoUrl || null,
        },
      });
      revalidatePath("/");
      return { success: true, isFavorite: true };
    }
  } catch (error: any) {
    console.error("Favori işlemi hatası:", error);
    return { success: false, isFavorite: false, error: error.message };
  }
}

// === TIKTOK SESİ VERİTABANI GÜNCELLEMELERİ ===

export async function saveTikTokAudioToFavorite(
  favoriteId: string,
  tiktokVideoUrl: string,
  customPreviewUrl: string
): Promise<{ success: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    await db.favorite.update({
      where: { id: favoriteId },
      data: {
        tiktokVideoUrl,
        customPreviewUrl,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Favori TikTok sesi kaydedilemedi:", error);
    return { success: false, error: error.message };
  }
}

export async function saveTikTokAudioToTrack(
  trackId: string,
  tiktokVideoUrl: string,
  customPreviewUrl: string
): Promise<{ success: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    await db.track.update({
      where: { id: trackId },
      data: {
        tiktokVideoUrl,
        customPreviewUrl,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Şarkı TikTok sesi kaydedilemedi:", error);
    return { success: false, error: error.message };
  }
}

// === INSTAGRAM SESİ VERİTABANI GÜNCELLEMELERİ ===

export async function saveInstagramAudioToFavorite(
  favoriteId: string,
  instagramVideoUrl: string,
  instagramAudioUrl: string
): Promise<{ success: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    await db.favorite.update({
      where: { id: favoriteId },
      data: {
        instagramVideoUrl,
        instagramAudioUrl,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Favori Instagram sesi kaydedilemedi:", error);
    return { success: false, error: error.message };
  }
}

export async function saveInstagramAudioToTrack(
  trackId: string,
  instagramVideoUrl: string,
  instagramAudioUrl: string
): Promise<{ success: boolean; error?: string }> {
  const isDbConnected = await checkDbConnected();
  if (!isDbConnected) {
    return { success: false, error: "DB_NOT_CONNECTED" };
  }

  try {
    await db.track.update({
      where: { id: trackId },
      data: {
        instagramVideoUrl,
        instagramAudioUrl,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Şarkı Instagram sesi kaydedilemedi:", error);
    return { success: false, error: error.message };
  }
}
