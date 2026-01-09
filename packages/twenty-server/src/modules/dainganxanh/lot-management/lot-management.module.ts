import { Module } from '@nestjs/common';
import { LotController } from './controllers/lot.controller';
import { LotService } from './services/lot.service';
import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';

@Module({
    imports: [GlobalWorkspaceDataSourceModule],
    controllers: [LotController],
    providers: [LotService],
    exports: [LotService],
})
export class LotManagementModule { }
