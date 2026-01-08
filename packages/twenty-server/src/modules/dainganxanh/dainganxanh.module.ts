import { Module } from '@nestjs/common';

import { TreeTrackingModule } from 'src/modules/dainganxanh/tree-tracking/tree-tracking.module';
import { PaymentModule } from 'src/modules/dainganxanh/payment/payment.module';
import { ShareCardModule } from 'src/modules/dainganxanh/share-card/share-card.module';

@Module({
    imports: [TreeTrackingModule, PaymentModule, ShareCardModule],
    providers: [],
    exports: [],
})
export class DainganxanhModule { }
