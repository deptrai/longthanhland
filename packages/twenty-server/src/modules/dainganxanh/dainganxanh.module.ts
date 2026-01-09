import { Module } from '@nestjs/common';

import { TreeTrackingModule } from 'src/modules/dainganxanh/tree-tracking/tree-tracking.module';
import { PaymentModule } from 'src/modules/dainganxanh/payment/payment.module';
import { ShareCardModule } from 'src/modules/dainganxanh/share-card/share-card.module';
import { LotManagementModule } from 'src/modules/dainganxanh/lot-management/lot-management.module';

@Module({
    imports: [TreeTrackingModule, PaymentModule, ShareCardModule, LotManagementModule],
    providers: [],
    exports: [],
})
export class DainganxanhModule { }
