import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

import { SeedEpic1MetadataService } from 'src/database/services/seed-epic1-metadata.service';

/**
 * Epic 1 Metadata Seeding Command
 * 
 * Automatically creates custom objects for Epic 1 after database reset:
 * - Tree, TreeLot, Order, TreePhoto, TreeHealthLog
 * - All fields and relations
 * 
 * Usage:
 *   yarn command workspace:seed:epic1
 * 
 * Or automatically via:
 *   yarn database:reset (triggers this command)
 */
@Command({
    name: 'workspace:seed:epic1',
    description:
        'Seed Epic 1 custom objects (Tree, TreeLot, Order, TreePhoto, TreeHealthLog) into workspace metadata.',
})
export class SeedEpic1MetadataCommand extends CommandRunner {
    private readonly logger = new Logger(SeedEpic1MetadataCommand.name);

    constructor(
        private readonly seedEpic1MetadataService: SeedEpic1MetadataService,
    ) {
        super();
    }

    async run(): Promise<void> {
        try {
            this.logger.log('🌳 Starting Epic 1 metadata seeding...');

            await this.seedEpic1MetadataService.seedEpic1Metadata();

            this.logger.log('✅ Epic 1 metadata seeded successfully!');
        } catch (error) {
            this.logger.error('❌ Epic 1 metadata seeding failed:', error);
            this.logger.error(error.stack);
            throw error;
        }
    }
}
