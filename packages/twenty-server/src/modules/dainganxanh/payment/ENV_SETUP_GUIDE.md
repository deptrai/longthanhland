# Environment Variables Setup Guide - E3.2 USDT Webhook

## 📋 Tổng Quan

Có 3 environment variables cần thiết cho E3.2 USDT Webhook:

```env
BLOCKCHAIN_WEBHOOK_SECRET=your_webhook_secret_here
BLOCKCHAIN_WEBHOOK_PROVIDER=quicknode  # hoặc alchemy, moralis
DEFAULT_WORKSPACE_ID=3b8e6458-5fc1-4e63-8563-008ccddaa6db
```

---

## 1️⃣ BLOCKCHAIN_WEBHOOK_SECRET

### Mục đích
Secret key để verify HMAC-SHA256 signature từ webhook provider, đảm bảo webhook requests là hợp lệ.

### Cách lấy với QuickNode (RECOMMENDED)

**Bước 1: Đăng ký QuickNode**
1. Truy cập [quicknode.com](https://www.quicknode.com)
2. Đăng ký tài khoản (có free tier)
3. Verify email

**Bước 2: Tạo Endpoint**
1. Click **"Create an endpoint"**
2. Chọn chain: **BSC (Binance Smart Chain)** hoặc **Polygon**
3. Chọn network: **Mainnet** (production) hoặc **Testnet** (development)
4. Click **Continue**

**Bước 3: Cấu hình Streams (Webhook)**
1. Sau khi endpoint được tạo, vào tab **Add-ons**
2. Tìm và enable **"Streams"** add-on
3. Click **"Create Stream"**
4. Cấu hình stream:
   ```
   Stream Type: Address Activity
   Addresses to Monitor: [địa chỉ ví nhận USDT của bạn]
   Filter: Token Transfers
   Token Address: 
     - BSC: 0x55d398326f99059fF775485246999027B3197955
     - Polygon: 0xc2132d05d31c914a87c6611c10748aeb04b58e8f
   ```

**Bước 4: Lấy Webhook Secret**
1. Trong stream settings, tìm **"Webhook URL"**
2. Nhập URL webhook của bạn: `https://your-domain.com/webhooks/blockchain`
3. Copy **"Signing Secret"** hoặc **"Webhook Secret"**
4. Đây chính là giá trị cho `BLOCKCHAIN_WEBHOOK_SECRET`

**Ví dụ:**
```env
BLOCKCHAIN_WEBHOOK_SECRET=qn_1a2b3c4d5e6f7g8h9i0j
```

### Alternative: Alchemy

**Bước 1-3:** Tương tự QuickNode
1. Đăng ký tại [alchemy.com](https://www.alchemy.com)
2. Tạo app (chọn BSC hoặc Polygon)
3. Vào **Notify** → **Webhooks**

**Bước 4:** Lấy Signing Key
1. Tạo webhook mới
2. Copy **"Signing Key"**

```env
BLOCKCHAIN_WEBHOOK_SECRET=alch_1a2b3c4d5e6f7g8h9i0j
```

### Alternative: Moralis

1. Đăng ký tại [moralis.io](https://moralis.io)
2. Tạo **Stream** cho USDT transfers
3. Copy **"Webhook Secret"**

```env
BLOCKCHAIN_WEBHOOK_SECRET=moralis_1a2b3c4d5e6f7g8h9i0j
```

### Development Mode

Nếu không có secret (testing local):
```env
# Để trống hoặc comment out
# BLOCKCHAIN_WEBHOOK_SECRET=
```
⚠️ **Warning:** Signature verification sẽ bị DISABLED!

---

## 2️⃣ BLOCKCHAIN_WEBHOOK_PROVIDER

### Mục đích
Xác định provider nào đang dùng để parse signature header đúng format.

### Giá trị hợp lệ

```env
# Nếu dùng QuickNode
BLOCKCHAIN_WEBHOOK_PROVIDER=quicknode

# Nếu dùng Alchemy
BLOCKCHAIN_WEBHOOK_PROVIDER=alchemy

# Nếu dùng Moralis
BLOCKCHAIN_WEBHOOK_PROVIDER=moralis
```

### Signature Headers theo Provider

| Provider  | Header Name           | Format      |
|-----------|-----------------------|-------------|
| QuickNode | `X-QN-Signature`      | hex (no 0x) |
| Alchemy   | `X-Alchemy-Signature` | 0x + hex    |
| Moralis   | `X-Moralis-Signature` | hex (no 0x) |

### Recommended: QuickNode

```env
BLOCKCHAIN_WEBHOOK_PROVIDER=quicknode
```

**Lý do:**
- ✅ RPC nhanh và stable
- ✅ Free tier generous (100M requests/month)
- ✅ Support cả BSC và Polygon
- ✅ Streams add-on miễn phí
- ✅ Documentation tốt

---

## 3️⃣ DEFAULT_WORKSPACE_ID

### Mục đích
UUID của workspace mặc định trong Twenty CRM system.

### Cách lấy

**Option 1: Từ Database (RECOMMENDED)**

```sql
-- Connect to PostgreSQL database
psql -U postgres -d twenty

-- Query workspace ID
SELECT id, "displayName", "domainName" 
FROM core.workspace 
ORDER BY "createdAt" DESC 
LIMIT 5;
```

**Output:**
```
                  id                  |  displayName   |    domainName
--------------------------------------+----------------+------------------
3b8e6458-5fc1-4e63-8563-008ccddaa6db | Dai Ngan Xanh  | dainganxanh.com
```

Copy UUID từ cột `id`.

**Option 2: Từ Twenty UI**

1. Login vào Twenty CRM: `http://localhost:3000`
2. Vào **Settings** → **Workspace**
3. Copy **Workspace ID** từ URL hoặc settings
   - URL format: `/settings/workspace/{workspace-id}`

**Option 3: Tạo Workspace Mới**

Nếu chưa có workspace:

```sql
INSERT INTO core.workspace (
    "displayName", 
    "domainName",
    "logo",
    "inviteHash"
) 
VALUES (
    'Dai Ngan Xanh',
    'dainganxanh.com',
    NULL,
    md5(random()::text)
)
RETURNING id;
```

**Option 4: Dùng UUID hiện tại**

Nếu đang development và chưa setup database:

```env
# UUID đang dùng trong code
DEFAULT_WORKSPACE_ID=3b8e6458-5fc1-4e63-8563-008ccddaa6db
```

---

## 🔧 File Cấu Hình Hoàn Chỉnh

### Development (.env.development)

```env
# QuickNode Webhook Configuration
BLOCKCHAIN_WEBHOOK_SECRET=qn_dev_test_secret_123
BLOCKCHAIN_WEBHOOK_PROVIDER=quicknode

# Workspace
DEFAULT_WORKSPACE_ID=3b8e6458-5fc1-4e63-8563-008ccddaa6db

# QuickNode RPC (optional, for verification)
BSC_RPC_URL=https://your-quicknode-endpoint.bsc.quiknode.pro/your-api-key/
POLYGON_RPC_URL=https://your-quicknode-endpoint.matic.quiknode.pro/your-api-key/
```

### Production (.env.production)

```env
# QuickNode Webhook Configuration
BLOCKCHAIN_WEBHOOK_SECRET=${QUICKNODE_WEBHOOK_SECRET}
BLOCKCHAIN_WEBHOOK_PROVIDER=quicknode

# Workspace
DEFAULT_WORKSPACE_ID=${PRODUCTION_WORKSPACE_ID}

# QuickNode RPC
BSC_RPC_URL=${QUICKNODE_BSC_RPC}
POLYGON_RPC_URL=${QUICKNODE_POLYGON_RPC}

# AWS S3 (for contract PDFs)
AWS_S3_BUCKET_NAME=${S3_BUCKET}
AWS_ACCESS_KEY_ID=${AWS_KEY}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET}
AWS_REGION=ap-southeast-1
```

---

## ✅ Verification Checklist

### 1. Test Webhook Secret

```bash
# Test với curl
curl -X POST http://localhost:3000/webhooks/blockchain \
  -H "Content-Type: application/json" \
  -H "X-QN-Signature: test-signature" \
  -d '{"txHash":"0xtest","network":"bsc"}'

# Expected: 401 Unauthorized (invalid signature)
```

### 2. Test Health Endpoint

```bash
curl http://localhost:3000/webhooks/blockchain/health

# Expected: {"status":"ok","service":"blockchain-webhook"}
```

### 3. Check Logs

```bash
# Server logs should show:
# [WebhookSignatureGuard] ✅ Webhook signature verified
# OR
# [WebhookSignatureGuard] ⚠️ BLOCKCHAIN_WEBHOOK_SECRET not set
```

---

## 🚀 QuickNode Setup Tutorial

### Step-by-Step Setup (COMPLETED)

**1. Create QuickNode Stream**
- Navigate to: https://dashboard.quicknode.com/streams/new
- Stream Name: `USDT-BSC-Webhook` (or any name you prefer)
- Network: **BNB Smart Chain** → **Mainnet**
- Click **Next**

**2. Select Dataset**
- Dataset: **Block** (default is fine for monitoring all transactions)
- Click **Next**

**3. Configure Destination**
- Destination Type: **Webhook**
- Destination URL: `https://your-domain.com/webhooks/blockchain`
  - Example: `https://dainganxanh.com.vn/webhooks/blockchain`
- **Security Token**: 
  - QuickNode auto-generates a security token
  - Click the **eye icon** 👁️ to reveal the token
  - **COPY THIS TOKEN** - this is your `BLOCKCHAIN_WEBHOOK_SECRET`
- Click **Create a Stream**

**4. Copy Security Token**
```bash
# After clicking eye icon, copy the token
# It will look something like: qn_abc123def456ghi789...
```

**5. Update .env File**
```env
# Replace <token_từ_quicknode> with actual token from QuickNode
BLOCKCHAIN_WEBHOOK_SECRET=qn_abc123def456ghi789

# Keep these as-is
BLOCKCHAIN_WEBHOOK_PROVIDER=quicknode
DEFAULT_WORKSPACE_ID=3b8e6458-5fc1-4e63-8563-008ccddaa6db
```

---

## 🔧 Local Development Setup

### ⚠️ Vấn Đề: "Unknown error" khi Check Connection

QuickNode cần **public URL** để test webhook. Localhost không hoạt động!

### ✅ Giải Pháp: Dùng ngrok

**1. Cài đặt ngrok**
```bash
# macOS
brew install ngrok

# Hoặc download: https://ngrok.com/download
```

**2. Start Server Local**
```bash
cd /Users/mac_1/Documents/GitHub/dainganxanh/d
yarn nx run twenty-server:dev
# Server chạy ở port 3000
```

**3. Expose qua ngrok**
```bash
# Terminal mới
ngrok http 3000

# Output:
# Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

**4. Update QuickNode Webhook URL**
```
# Thay vì:
https://dainganxanh.com.vn/webhooks/blockchain

# Dùng:
https://abc123.ngrok.io/webhooks/blockchain
```

**5. Test Connection**
- Click "Check Connection" → ✅ Success!
- Click "Create a Stream"

### 📌 Lưu Ý về ngrok

**Free Tier:**
- URL thay đổi mỗi lần restart ngrok
- Phải update lại URL trong QuickNode
- Giới hạn 40 connections/minute

**Paid Tier ($8/month):**
- Fixed URL (subdomain riêng)
- Không cần update URL
- Unlimited connections

### 🚀 Production Deployment

Khi deploy production:
1. Update Webhook URL thành domain thật
2. Đảm bảo SSL certificate hợp lệ
3. Test lại connection
4. Monitor webhook logs

---

## 📞 Support

**QuickNode Documentation:**
- Streams: https://www.quicknode.com/docs/streams
- Webhooks: https://www.quicknode.com/docs/streams/webhooks

**Nếu gặp vấn đề:**
1. Check server logs
2. Verify environment variables loaded: `console.log(process.env.BLOCKCHAIN_WEBHOOK_SECRET)`
3. Test với development mode (no secret) trước
4. Enable debug logging trong guard
