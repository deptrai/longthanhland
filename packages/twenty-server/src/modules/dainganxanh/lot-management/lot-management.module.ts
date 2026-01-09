import { Module } from '@nestjs/common';
import { LotController } from './controllers/lot.controller';
import { LotService } from './services/lot.service';
import { GlobalWorkspaceOrmManagerModule } from 'src/engine/workspace-manager/workspace-orm-manager/global-workspace-orm-manager.module';

@Module({
    imports: [GlobalWorkspaceOrmManagerModule],
    controllers: [LotController],
    providers: [LotService],
    exports: [LotService],
})
export class LotManagementModule { }
