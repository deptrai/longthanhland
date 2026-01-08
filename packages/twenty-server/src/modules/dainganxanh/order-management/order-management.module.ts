import { Module } from '@nestjs/common';

import { GlobalWorkspaceDataSourceModule } from 'src/engine/twenty-orm/global-workspace-datasource/global-workspace-datasource.module';

import { OrderService } from './services/order.service';

@Module({
    imports: [GlobalWorkspaceDataSourceModule],
    providers: [OrderService],
    exports: [OrderService],
})
export class OrderManagementModule { }
