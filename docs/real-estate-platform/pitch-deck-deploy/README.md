# 🚀 Pitch Deck Deployment Guide

Deploy pitch deck HTML lên web bằng Dokploy.com

## 📁 Cấu Trúc Thư Mục

```
pitch-deck-deploy/
├── index.html          # Pitch deck HTML
├── Dockerfile          # Docker configuration
├── .dockerignore       # Files to ignore
└── README.md          # Hướng dẫn này
```

## 🎯 Cách Deploy Lên Dokploy

### Bước 1: Push Code Lên GitHub

```bash
# Nếu chưa có Git repository
cd /Users/mac_1/Documents/GitHub/longthanhland
git add docs/real-estate-platform/pitch-deck-deploy/
git commit -m "feat: add pitch deck deployment setup"
git push origin main
```

### Bước 2: Tạo Project Trên Dokploy

1. **Đăng nhập vào Dokploy Dashboard**: https://your-dokploy-instance.com
2. **Tạo Project Mới**:
   - Click "Create Project"
   - Chọn "Docker" hoặc "Dockerfile"
3. **Connect GitHub Repository**:
   - Chọn repository: `longthanhland`
   - Branch: `main`
   - Build Context: `docs/real-estate-platform/pitch-deck-deploy`
   - Dockerfile Path: `Dockerfile`

### Bước 3: Cấu Hình Deploy

**Port Configuration:**
- Container Port: `80`
- Public Port: `80` hoặc `443` (nếu có SSL)

**Environment Variables:** (không cần)

**Domain:**
- Sử dụng domain mặc định của Dokploy
- Hoặc custom domain: `pitch.yourdomain.com`

### Bước 4: Deploy

1. Click **"Deploy"** button
2. Đợi build process hoàn thành (~1-2 phút)
3. Truy cập URL được cung cấp

## 🔧 Deploy Thủ Công (Alternative)

Nếu không dùng Dokploy, bạn có thể deploy bằng Docker:

```bash
# Build Docker image
cd docs/real-estate-platform/pitch-deck-deploy
docker build -t pitch-deck .

# Run container
docker run -d -p 8080:80 --name pitch-deck pitch-deck

# Truy cập tại: http://localhost:8080
```

## 🌐 Deploy Lên Các Platform Khác

### Vercel (Miễn phí)
```bash
cd docs/real-estate-platform/pitch-deck-deploy
npx vercel --prod
```

### Netlify (Miễn phí)
```bash
cd docs/real-estate-platform/pitch-deck-deploy
npx netlify-cli deploy --prod --dir .
```

### GitHub Pages (Miễn phí)
1. Push code lên GitHub
2. Settings → Pages → Source: `main` branch
3. Folder: `/docs/real-estate-platform/pitch-deck-deploy`

## 📊 Thông Tin Kỹ Thuật

- **Base Image**: nginx:alpine (~5MB)
- **Port**: 80
- **Build Time**: ~30 giây
- **Memory**: ~10MB
- **CPU**: Minimal

## 🔒 Bảo Mật (Optional)

Nếu muốn thêm basic authentication:

```dockerfile
# Thêm vào Dockerfile
RUN apk add --no-cache apache2-utils
RUN htpasswd -bc /etc/nginx/.htpasswd admin yourpassword

# Thêm vào nginx.conf
auth_basic "Restricted Access";
auth_basic_user_file /etc/nginx/.htpasswd;
```

## 📝 Lưu Ý

- File HTML đã được tối ưu cho presentation
- Không cần database hay backend
- Tự động scale với Nginx
- Hỗ trợ HTTPS nếu cấu hình SSL trên Dokploy

## 🆘 Troubleshooting

**Lỗi: Port already in use**
```bash
docker stop pitch-deck
docker rm pitch-deck
```

**Lỗi: Build failed**
- Kiểm tra Dockerfile syntax
- Đảm bảo index.html tồn tại

**Lỗi: 404 Not Found**
- Kiểm tra file path trong Dockerfile
- Verify nginx configuration

## 📞 Support

Nếu cần hỗ trợ, liên hệ team hoặc check Dokploy documentation:
- https://docs.dokploy.com

