async function testAPIs() {
  const artist = "Mert Demir";
  const title = "Ateşe Düştüm";
  const cleanArtist = artist.split("feat.")[0].split("&")[0].trim();
  const cleanTitle = title.split("(")[0].split("-")[0].trim();
  const query = encodeURIComponent(`${cleanArtist} ${cleanTitle}`);

  console.log("Query:", query);

  // 1. Deezer
  try {
    const deezerRes = await fetch(`https://api.deezer.com/search?q=${query}&limit=1`);
    const deezerData = await deezerRes.json();
    console.log("Deezer Preview URL:", deezerData.data?.[0]?.preview || "BULUNAMADI");
  } catch (e) {
    console.error("Deezer Hatası:", e.message);
  }
}

testAPIs();
