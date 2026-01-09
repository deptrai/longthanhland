import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { ObjectMetadataService } from 'src/engine/metadata-modules/object-metadata/object-metadata.service';
import { FieldMetadataService } from 'src/engine/metadata-modules/field-metadata/field-metadata.service';
import { RelationMetadataService } from 'src/engine/metadata-modules/relation-metadata/relation-metadata.service';

/**
 * Epic 1 Metadata Migration using Twenty's Internal Services
 * 
 * ADVANTAGES:
 * - No API key required
 * - Uses Twenty's business logic (validation, schema generation, cache update)
 * - Faster than HTTP API
 * - Runs in same process as Twenty server
 * - Proper error handling and transaction support
 * 
 * Usage:
 *   yarn ts-node packages/twenty-server/scripts/restore-epic1-internal.ts
 */

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ['error', 'warn', 'log'],
    });

    const objectMetadataService = app.get(ObjectMetadataService);
    const fieldMetadataService = app.get(FieldMetadataService);
    const relationMetadataService = app.get(RelationMetadataService);

    console.log('🚀 Starting Epic 1 metadata restoration using internal services...\n');

    try {
        // Get default workspace (assuming single workspace setup)
        const workspaceId = process.env.WORKSPACE_ID || 'default-workspace-id';

        // Step 1: Create Objects
        console.log('📦 Creating objects...\n');

        const treeObject = await objectMetadataService.createOne({
            nameSingular: 'tree',
            namePlural: 'trees',
            labelSingular: 'Cây',
            labelPlural: 'Cây',
            description: 'E1.1 - Tree object',
            icon: 'IconTree',
            workspaceId,
        });
        console.log(`✅ Created Tree object: ${treeObject.id}`);

        const treeLotObject = await objectMetadataService.createOne({
            nameSingular: 'treeLot',
            namePlural: 'treeLots',
            labelSingular: 'Lô cây',
            labelPlural: 'Lô cây',
            description: 'E1.2 - TreeLot object',
            icon: 'IconMapPin',
            workspaceId,
        });
        console.log(`✅ Created TreeLot object: ${treeLotObject.id}`);

        // ... continue for Order, TreePhoto, TreeHealthLog

        // Step 2: Create Fields
        console.log('\n🔧 Creating fields...\n');

        await fieldMetadataService.createOne({
            name: 'treeCode',
            label: 'Mã cây',
            type: 'TEXT',
            objectMetadataId: treeObject.id,
            workspaceId,
            isNullable: false,
        });
        console.log('  ✅ Created field: treeCode');

        // ... continue for all fields

        // Step 3: Create Relations
        console.log('\n🔗 Creating relations...\n');

        // Tree → Person (owner)
        await relationMetadataService.createOneRelation({
            relationType: 'MANY_TO_ONE',
            fromObjectMetadataId: treeObject.id,
            toObjectMetadataId: personObjectId, // Get from built-in objects
            fromName: 'owner',
            toName: 'ownedTrees',
            workspaceId,
        });
        console.log('✅ Created relation: Tree → Person (owner)');

        // ... continue for all relations

        console.log('\n✅ Epic 1 metadata restoration completed!\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await app.close();
    }
}

bootstrap()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
