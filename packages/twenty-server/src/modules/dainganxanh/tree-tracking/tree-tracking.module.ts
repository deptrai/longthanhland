import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';
import { EmailModule } from 'src/engine/core-modules/email/email.module';
import { FileUploadService } from 'src/engine/core-modules/file/file-upload/services/file-upload.service';
import { FileStorageModule } from 'src/engine/core-modules/file-storage/file-storage.module';
import { FileModule } from 'src/engine/core-modules/file/file.module';

import { TreeService } from './services/tree.service';
import { TreePhotoService } from './services/tree-photo.service';
import { TreeHealthService } from './services/tree-health.service';
import { CarbonCalculatorService } from './services/carbon-calculator.service';
import { QuarterlyUpdateService } from './services/quarterly-update.service';
import { PhotoUploadController } from './controllers/photo-upload.controller';

@Module({
    imports: [
        GlobalWorkspaceDataSourceModule,
        EmailModule,
        FileStorageModule.forRoot(),
        FileModule,
        HttpModule,
    ],
    controllers: [PhotoUploadController],
    providers: [
        TreeService,
        TreePhotoService,
        TreeHealthService,
        CarbonCalculatorService,
        QuarterlyUpdateService,
        FileUploadService,
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
