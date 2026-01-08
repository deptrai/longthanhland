# Tree Object Migration - Quick Start Guide

## Prerequisites
- Twenty server running on `localhost:3000`
- Workspace ID configured

## Step 1: Start Twenty Server
```bash
cd packages/twenty-server
yarn start:dev
```

## Step 2: Run Migration Script
```bash
# From project root
cd packages/twenty-server
ts-node scripts/create-tree-object.ts
```

## Step 3: Verify in Twenty UI
1. Open http://localhost:3000
2. Go to Settings > Data model > Objects
3. Find "Cây" (Tree) object
4. Verify fields:
   - ✓ Mã cây (treeCode) - TEXT, required
   - ✓ Trạng thái (status) - SELECT
   - ✓ Ngày trồng (plantingDate) - DATE_TIME
   - ✓ Ngày thu hoạch dự kiến (harvestDate) - DATE_TIME
   - ✓ CO2 hấp thụ (co2Absorbed) - NUMBER
   - ✓ Chiều cao (heightCm) - NUMBER
   - ✓ Điểm sức khỏe (healthScore) - NUMBER
   - ✓ Ảnh mới nhất (latestPhoto) - TEXT
   - ✓ Vị trí GPS (gpsLocation) - LINKS

## Step 4: Run Integration Tests
```bash
cd packages/twenty-server
yarn test:integration tree-object.integration.test.ts
```

## Expected Output
```
✅ Tree object created successfully
   Object ID: <uuid>
   ✓ Created field: treeCode
   ✓ Created field: status
   ✓ Created field: plantingDate
   ✓ Created field: harvestDate
   ✓ Created field: co2Absorbed
   ✓ Created field: heightCm
   ✓ Created field: healthScore
   ✓ Created field: latestPhoto
✅ GPS location field created
✅ Owner relation created

✅ Tree object migration completed successfully!
```

## Troubleshooting

### Error: "Cannot connect to metadata API"
- Ensure Twenty server is running
- Check `METADATA_API_URL` environment variable

### Error: "Object already exists"
- Tree object was already created
- Skip to verification step

### Error: "Person object not found"
- Ensure Twenty's built-in Person object exists
- Check workspace configuration

## Next Steps
After successful migration:
1. Complete E1.2 (TreeLot object)
2. Complete E1.3 (Order object)
3. Return to E1.1 to add lot/order relations
