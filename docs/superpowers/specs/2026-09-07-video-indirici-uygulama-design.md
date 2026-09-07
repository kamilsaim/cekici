# Video İndirici Mobil Uygulama — Tasarım

## Amaç

YouTube, Instagram ve X (Twitter) üzerinden video indirmeyi sağlayan, telefonda çalışan bir uygulama arayüzü. İndirme geçmişi ve kullanım rehberi içerir.

## Görsel Stil

- **Yön:** Renkli & Eğlenceli
- Zemin: krem/beyaz (`#fff7f0` → `#ffeef5` gradyan)
- Vurgu: turuncu→pembe gradyan (`#ff7a59` → `#ff4d8d`)
- Köşeler: yuvarlak (kartlar 16-20px, ana kapsayıcı 28px)
- Platform rozetleri: YouTube kırmızı (`#ff2d55`), Instagram gradyan (`#f58529`→`#dd2a7b`→`#8134af`), X siyah

## Bilgi Mimarisi — Alt Menü (4 sekme)

1. **İndir** — ana ekran, link ekleme ve indirme kuyruğu
2. **Geçmiş** — indirilen dosyaların listesi
3. **Nasıl Kullanılır** — kullanım rehberi
4. **Ayarlar** — uygulama ayarları

## Ekran 1: İndir (kuyruk / çoklu indirme)

- Tek bir metin kutusuna link yapıştırılır; uygulama linkin hangi platforma (YouTube/Instagram/X) ait olduğunu otomatik algılar.
- "+" ile eklenen her link, indirme kuyruğuna bir kart olarak eklenir. Kuyrukta aynı anda birden fazla video bekletilebilir (çoklu indirme).
- Her kuyruk kartında:
  - Küçük resim (thumbnail) ve platform rozeti
  - Video başlığı
  - **Video / Ses** seçim çipleri
    - Video seçiliyse: kalite çipleri (1080p / 720p / 480p vb.)
    - Ses seçiliyse: bitrate çipleri (**128 / 192 / 320 kbps**)
  - Kuyruktan çıkarma (✕) butonu
- Alt kısımda sabit **"Tümünü İndir (N)"** butonu — kuyruktaki tüm videoları toplu olarak indirir.
- Ekranın altında "Son indirilenler" kısa özeti (opsiyonel, Geçmiş'e kısayol).

## Ekran 2: Geçmiş

- Üstte filtre çipleri: **Tümü / YouTube / Instagram / X**
- Liste **tarihe göre gruplanır**: Bugün / Dün / Bu hafta / Daha eski
- Her kartta:
  - Küçük resim, platform rozeti, başlık
  - Meta bilgi: saat, kalite/bitrate, dosya boyutu
  - Aksiyonlar: **Oynat / Paylaş / Tekrar indir / Sil**

## Ekran 3: Nasıl Kullanılır

- 4 adımlık görsel kart rehberi:
  1. Videoyu bul, linkini kopyala
  2. Uygulamaya yapıştır
  3. Kalite / format seç (video kalitesi veya ses + bitrate)
  4. İndir'e dokun
- Alt kısımda ipucu kutusu: çoklu link ekleyip toplu indirme hatırlatması.

## Ekran 4: Ayarlar

- İndirme konumu (dosyaların cihazda kaydedileceği klasör)
- Varsayılan video/ses kalitesi (yeni eklenen linklerde otomatik seçili gelecek değer)
- Tema (açık/koyu)
- Geçmişi toplu temizle
- Hakkında / sürüm bilgisi

## Kapsam Dışı (bu tasarımda ele alınmadı)

- Backend/indirme motoru mimarisi (yt-dlp vb. entegrasyonu, platform ToS/telif konuları)
- Hesap/oturum sistemi
- Bildirimler
- Altyazı indirme
- Paylaş menüsünden (share sheet) link alma — ileride eklenebilir, ilk sürümde sadece uygulama içi yapıştırma var

## Kullanıcı Onayları (brainstorming sürecinde)

- Görsel stil: Renkli & Eğlenceli ✅
- İndirme seçenekleri: Video kalitesi + Ses only ✅
- Link girişi: Tek kutuya yapıştır, otomatik platform algılama ✅
- Alt menü: İndir, Geçmiş, Nasıl Kullanılır, Ayarlar ✅
- Çoklu indirme (kuyruk) + ses kalitesi (bitrate) seçimi eklendi ✅
- Geçmiş aksiyonları: Oynat, Paylaş, Tekrar indir, Sil ✅
- Geçmiş gruplama: Tarih + platform filtresi ✅
- Nasıl Kullanılır formatı: Adım adım kartlar ✅
- Ayarlar içeriği: İndirme konumu, varsayılan kalite, tema, geçmişi temizle, hakkında ✅
