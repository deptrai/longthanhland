import { Module } from '@nestjs/common';

import { ShareCardGeneratorService } from './services/share-card-generator.service';
import { ShareCardController } from './controllers/share-card.controller';

@Module({
    imports: [],
    controllers: [ShareCardController],
    providers: [ShareCardGeneratorService],
    exports: [ShareCardGeneratorService],
})
export class ShareCardModule { }
