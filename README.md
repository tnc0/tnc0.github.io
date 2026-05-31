# Yusuf Tunç — Portfolyo Sitesi

## Klasör Yapısı

```
portfolio/
├── public/              ← Tüm HTML dosyaları buraya
│   ├── index.html       ← Ana sayfa (portfolyo)
│   ├── blog.html        ← Blog listesi
│   ├── blog-post.html   ← Tekil blog yazısı
│   ├── admin.html       ← Admin paneli
│   └── portfolyo/       ← Mevcut resim klasörün buraya taşı
│       └── resimler/
├── data/
│   └── posts.json       ← Blog yazıları buraya kaydedilir (otomatik)
├── server.js            ← Node.js sunucusu
├── package.json
├── .env                 ← Gizli ayarlar (bu dosyayı oluşturman lazım!)
└── .env.example         ← .env şablonu
```

---

## Kurulum

### 1. Node.js Gereksinimi
Node.js yüklü değilse: https://nodejs.org adresinden indir (LTS sürümü)

### 2. Bağımlılıkları Yükle
```bash
cd portfolio
npm install
```

### 3. .env Dosyasını Oluştur
`.env.example` dosyasını kopyala ve `.env` olarak kaydet:
```bash
cp .env.example .env
```

Sonra `.env` dosyasını bir metin editörüyle aç ve doldur:
```
PORT=3000
ADMIN_PASSWORD=guvenli-bir-sifre-sec
SESSION_SECRET=uzun-rastgele-bir-yazi
EMAIL_USER=gmail-adresin@gmail.com
EMAIL_PASS=gmail-uygulama-sifresi
EMAIL_TO=yusuftuncc5@gmail.com
```

### 4. Gmail Uygulama Şifresi (İletişim Formu İçin)
1. Google Hesabı → Güvenlik → 2 Adımlı Doğrulama'yı aç
2. Güvenlik → "Uygulama şifreleri" → "Posta" ve "Bilgisayar" seç
3. Oluşturulan 16 haneli şifreyi `EMAIL_PASS`'e yapıştır

### 5. Resimlerini Taşı
Mevcut `portfolyo/resimler/` klasörünü `public/` içine kopyala:
```
public/portfolyo/resimler/bebek.jpg
public/portfolyo/resimler/cocuk.jpg
...
```

### 6. Sunucuyu Başlat
```bash
npm start
```
veya geliştirme modunda (otomatik yenileme):
```bash
npm run dev
```

Tarayıcıda aç: **http://localhost:3000**

---

## Kullanım

### Blog Yazısı Eklemek
1. http://localhost:3000/admin.html adresine git
2. `.env` dosyasındaki `ADMIN_PASSWORD` şifreni gir
3. Forma başlık, kategori, kapak görseli URL'si ve içeriği yaz
4. "Yayınla" butonuna bas

### Yazıları Görmek
http://localhost:3000/blog.html

### İletişim Formu
index.html'deki form doldurulduğunda, `EMAIL_TO` adresine e-posta gönderilir.

---

## Notlar
- `data/posts.json` dosyası otomatik oluşturulur, silme!
- Admin oturumu 8 saat geçerlidir, sonra tekrar giriş gerekir
- Ctrl+C ile sunucuyu durdurabilirsin