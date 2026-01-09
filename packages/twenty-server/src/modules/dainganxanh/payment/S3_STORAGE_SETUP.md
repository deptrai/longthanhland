# S3 Storage Configuration for Production

## ✅ E3.3 Implementation Status

**ContractService đã hỗ trợ HOÀN TOÀN cả LOCAL và S3 storage!**

### Cách Hoạt Động:

```typescript
// contract.service.ts (line 89-119)
async uploadContract(filename: string, pdfBuffer: Buffer, workspaceId: string) {
  // Sử dụng FileStorageService - tự động chọn driver dựa trên STORAGE_TYPE
  await this.fileStorageService.write({
    file: pdfBuffer,
    name: filename,
    mimeType: 'application/pdf',
    folder: `workspace-${workspaceId}/contract`,
  });
  
  // FileStorageService tự động:
  // - Nếu STORAGE_TYPE=local → Lưu vào .local-storage/
  // - Nếu STORAGE_TYPE=s3 → Upload lên S3 bucket
}
```

---

## 🔧 Setup S3 cho Production

### Bước 1: Tạo S3 Bucket trên AWS

1. Đăng nhập AWS Console → S3
2. Tạo bucket mới: `dainganxanh-files` (hoặc tên khác)
3. Region: `ap-southeast-1` (Singapore)
4. **Block Public Access**: Bật (để bảo mật)
5. **Versioning**: Tùy chọn (khuyến nghị bật)

### Bước 2: Tạo IAM User với S3 Access

1. AWS Console → IAM → Users → Create User
2. User name: `dainganxanh-s3-user`
3. Attach policy: `AmazonS3FullAccess` (hoặc custom policy)
4. Tạo Access Key → Lưu lại:
   - Access Key ID
   - Secret Access Key

### Bước 3: Cấu Hình `.env`

Thêm vào file `.env` của bạn:

```env
# ============================================
# FILE STORAGE CONFIGURATION
# ============================================

# Development: LOCAL storage
# STORAGE_TYPE=local
# STORAGE_LOCAL_PATH=.local-storage

# Production: S3 storage
STORAGE_TYPE=s3
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_NAME=dainganxanh-files
STORAGE_S3_ENDPOINT=https://s3.ap-southeast-1.amazonaws.com
STORAGE_S3_ACCESS_KEY_ID=AKIA...your-key-id
STORAGE_S3_SECRET_ACCESS_KEY=your-secret-access-key
```

### Bước 4: Verify Config

```bash
# Check env variables
cd packages/twenty-server
yarn start:dev

# Logs should show:
# [FileStorageDriverFactory] Using S3 driver
# [FileStorageDriverFactory] Bucket: dainganxanh-files
```

---

## 📋 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `STORAGE_TYPE` | Yes | `local` | `local` hoặc `s3` |
| `STORAGE_LOCAL_PATH` | If LOCAL | `.local-storage` | Path lưu files local |
| `STORAGE_S3_REGION` | If S3 | - | AWS region (vd: `ap-southeast-1`) |
| `STORAGE_S3_NAME` | If S3 | - | S3 bucket name |
| `STORAGE_S3_ENDPOINT` | If S3 | - | S3 endpoint URL |
| `STORAGE_S3_ACCESS_KEY_ID` | If S3 | - | AWS Access Key ID |
| `STORAGE_S3_SECRET_ACCESS_KEY` | If S3 | - | AWS Secret Access Key |

---

## 🔐 Security Best Practices

### 1. S3 Bucket Policy (Private Files)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::dainganxanh-files/*",
      "Condition": {
        "StringNotEquals": {
          "aws:PrincipalArn": "arn:aws:iam::YOUR-ACCOUNT-ID:user/dainganxanh-s3-user"
        }
      }
    }
  ]
}
```

### 2. IAM Policy (Least Privilege)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::dainganxanh-files",
        "arn:aws:s3:::dainganxanh-files/*"
      ]
    }
  ]
}
```

### 3. CORS Configuration (Nếu cần download từ browser)

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["https://dainganxanh.com.vn"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

---

## 🧪 Testing

### Test Local Storage

```bash
# .env
STORAGE_TYPE=local
STORAGE_LOCAL_PATH=.local-storage

# Files sẽ lưu vào:
# .local-storage/workspace-{workspaceId}/contract/{filename}.pdf
```

### Test S3 Storage

```bash
# .env
STORAGE_TYPE=s3
STORAGE_S3_REGION=ap-southeast-1
STORAGE_S3_NAME=dainganxanh-files

# Files sẽ upload lên:
# s3://dainganxanh-files/workspace-{workspaceId}/contract/{filename}.pdf
```

### Verify Upload

```bash
# Check S3 bucket
aws s3 ls s3://dainganxanh-files/workspace-{workspaceId}/contract/

# Download file để test
aws s3 cp s3://dainganxanh-files/workspace-{workspaceId}/contract/contract-ORD001.pdf ./test.pdf
```

---

## 💰 Cost Estimation (AWS S3)

| Metric | Estimate | Cost/Month |
|--------|----------|------------|
| Storage (1000 contracts × 500KB) | 500 MB | $0.01 |
| PUT requests (1000/month) | 1000 | $0.005 |
| GET requests (5000/month) | 5000 | $0.002 |
| **Total** | | **~$0.02/month** |

*Giá tham khảo cho region ap-southeast-1*

---

## 🚀 Migration từ Local sang S3

Nếu đã có files trong local storage và muốn migrate sang S3:

```bash
# 1. Backup local files
tar -czf local-storage-backup.tar.gz .local-storage/

# 2. Sync to S3
aws s3 sync .local-storage/ s3://dainganxanh-files/ --region ap-southeast-1

# 3. Update .env
STORAGE_TYPE=s3

# 4. Restart server
docker-compose restart server worker
```

---

## ✅ Checklist

- [ ] Tạo S3 bucket trên AWS
- [ ] Tạo IAM user với S3 access
- [ ] Cấu hình `.env` với S3 credentials
- [ ] Test upload contract PDF
- [ ] Verify file accessible qua signed URL
- [ ] Setup bucket policy cho security
- [ ] Enable versioning (optional)
- [ ] Setup lifecycle policy cho old files (optional)
