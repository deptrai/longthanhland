import { Module } from '@nestjs/common';

import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';

import { TreeService } from './services/tree.service';
import { TreePhotoService } from './services/tree-photo.service';
import { TreeHealthService } from './services/tree-health.service';
import { CarbonCalculatorService } from './services/carbon-calculator.service';
import { QuarterlyUpdateService } from './services/quarterly-update.service';
import { PhotoUploadController } from './controllers/photo-upload.controller';

@Module({
    imports: [GlobalWorkspaceDataSourceModule],
    controllers: [PhotoUploadController],
    providers: [
        TreeService,
        TreePhotoService,
        TreeHealthService,
        CarbonCalculatorService,
        QuarterlyUpdateService,
    ],
    exports: [
        TreeService,
        TreePhotoService,
        TreeHealthService,
        CarbonCalculatorService,
        QuarterlyUpdateService,
    ],
})
export class TreeTrackingModule { }

