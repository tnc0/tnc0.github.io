require('dotenv').config();
const express = require('express');
const session = require('express-session');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'posts.json');

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'gelistirme-gizli-anahtar',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000 } // 8 saat
}));

// ─── Yardımcı Fonksiyonlar ─────────────────────────────────────────────────────
function readPosts() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writePosts(posts) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(posts, null, 2), 'utf8');
}

function requireAdmin(req, res, next) {
  if (req.session.isAdmin) return next();
  res.status(401).json({ error: 'Yetkisiz erişim. Lütfen giriş yapın.' });
}

// ─── Admin Auth ────────────────────────────────────────────────────────────────
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(500).json({ error: '.env dosyasında ADMIN_PASSWORD tanımlanmamış!' });
  }

  if (password === adminPassword) {
    req.session.isAdmin = true;
    res.json({ success: true });
  } else {
    // Brute-force önlemi için küçük gecikme
    setTimeout(() => {
      res.status(401).json({ error: 'Yanlış şifre.' });
    }, 500);
  }
});

app.post('/api/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get('/api/admin/check', (req, res) => {
  res.json({ isAdmin: !!req.session.isAdmin });
});

// ─── Blog Posts API ────────────────────────────────────────────────────────────
// Tüm postları getir (herkese açık)
app.get('/api/posts', (req, res) => {
  const posts = readPosts();
  // Hassas alanları değil, liste için gerekenleri döndür
  const summary = posts.map(({ id, title, excerpt, category, coverImage, createdAt }) => ({
    id, title, excerpt, category, coverImage, createdAt
  }));
  res.json(summary);
});

// Tek post getir (herkese açık)
app.get('/api/posts/:id', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ error: 'Yazı bulunamadı.' });
  res.json(post);
});

// Yeni post oluştur (sadece admin)
app.post('/api/posts', requireAdmin, (req, res) => {
  const { title, excerpt, content, category, coverImage } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Başlık ve içerik zorunludur.' });
  }

  const posts = readPosts();
  const newPost = {
    id: uuidv4(),
    title: title.trim(),
    excerpt: excerpt?.trim() || content.substring(0, 160).trim() + '...',
    content: content.trim(),
    category: category?.trim() || 'Genel',
    coverImage: coverImage?.trim() || `https://picsum.photos/seed/${Date.now()}/800/400`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  posts.unshift(newPost); // En yeni başa
  writePosts(posts);

  console.log(`✅ Yeni blog yazısı oluşturuldu: "${newPost.title}"`);
  res.status(201).json(newPost);
});

// Post güncelle (sadece admin)
app.put('/api/posts/:id', requireAdmin, (req, res) => {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Yazı bulunamadı.' });

  const { title, excerpt, content, category, coverImage } = req.body;
  posts[index] = {
    ...posts[index],
    title: title?.trim() || posts[index].title,
    excerpt: excerpt?.trim() || posts[index].excerpt,
    content: content?.trim() || posts[index].content,
    category: category?.trim() || posts[index].category,
    coverImage: coverImage?.trim() || posts[index].coverImage,
    updatedAt: new Date().toISOString()
  };

  writePosts(posts);
  res.json(posts[index]);
});

// Post sil (sadece admin)
app.delete('/api/posts/:id', requireAdmin, (req, res) => {
  const posts = readPosts();
  const index = posts.findIndex(p => p.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: 'Yazı bulunamadı.' });

  const [deleted] = posts.splice(index, 1);
  writePosts(posts);

  console.log(`🗑️  Blog yazısı silindi: "${deleted.title}"`);
  res.json({ success: true });
});

// ─── İletişim Formu ────────────────────────────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  const { ad, email, konu, mesaj } = req.body;

  if (!ad || !email || !mesaj) {
    return res.status(400).json({ error: 'Ad, e-posta ve mesaj alanları zorunludur.' });
  }

  // E-posta formatı kontrolü
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Geçersiz e-posta formatı.' });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('⚠️  EMAIL_USER veya EMAIL_PASS .env dosyasında tanımlanmamış.');
    return res.status(500).json({ error: 'Sunucu e-posta ayarları yapılandırılmamış.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Portfolyo İletişim" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_TO || process.env.EMAIL_USER,
      replyTo: email,
      subject: `📬 Portfolyo: ${konu || 'Yeni Mesaj'} — ${ad}`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #0d6efd; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h2 style="margin:0;">📬 Yeni İletişim Mesajı</h2>
          </div>
          <div style="border: 1px solid #dee2e6; padding: 20px; border-radius: 0 0 8px 8px;">
            <table style="width:100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6c757d; width: 100px;"><b>Ad Soyad:</b></td>
                <td style="padding: 8px 0;">${ad}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d;"><b>E-posta:</b></td>
                <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6c757d;"><b>Konu:</b></td>
                <td style="padding: 8px 0;">${konu || '—'}</td>
              </tr>
            </table>
            <hr style="margin: 16px 0; border-color: #dee2e6;">
            <p style="color: #6c757d; margin-bottom: 8px;"><b>Mesaj:</b></p>
            <div style="background: #f8f9fa; padding: 16px; border-radius: 6px; white-space: pre-wrap;">${mesaj}</div>
          </div>
          <p style="color: #adb5bd; font-size: 12px; margin-top: 16px; text-align: center;">
            yusuftunc.portfolyo.com — ${new Date().toLocaleString('tr-TR')}
          </p>
        </body>
        </html>
      `
    });

    console.log(`📨 İletişim formu e-postası gönderildi. Gönderen: ${ad} <${email}>`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ E-posta gönderme hatası:', error.message);
    res.status(500).json({ error: 'E-posta gönderilemedi. Sunucu ayarlarını kontrol edin.' });
  }
});

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'Endpoint bulunamadı.' });
  } else {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// ─── Başlat ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Sunucu çalışıyor: http://localhost:${PORT}`);
  console.log(`📁 Blog yazıları: ${DATA_FILE}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('⚠️  ADMIN_PASSWORD .env dosyasında tanımlanmamış!');
  }
  console.log('─'.repeat(50));
});