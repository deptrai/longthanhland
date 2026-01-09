import {
    Controller,
    Post,
    Body,
    UseGuards,
    Req,
    Get,
    Param,
    Query,
} from '@nestjs/common';
// import { JwtAuthGuard } from 'src/engine/guards/jwt-auth.guard';
import { TreePhotoService, CreateTreePhotoDto } from '../services/tree-photo.service';

@Controller('api/dainganxanh/photos')
// @UseGuards(JwtAuthGuard)
export class PhotoUploadController {
    constructor(private readonly treePhotoService: TreePhotoService) { }

    /**
     * Upload single photo
     */
    @Post('upload')
    async uploadPhoto(
        @Body() data: CreateTreePhotoDto,
        @Req() req: any,
    ) {
        const workspaceId = req.user?.workspaceId || 'default';
        return this.treePhotoService.createPhoto(workspaceId, data);
    }

    /**
     * Batch upload multiple photos
     */
    @Post('batch-upload')
    async batchUpload(
        @Body() body: { photos: CreateTreePhotoDto[] },
        @Req() req: any,
    ) {
        const workspaceId = req.user?.workspaceId || 'default';
        const results = await Promise.all(
            body.photos.map((photo) =>
                this.treePhotoService.createPhoto(workspaceId, photo),
            ),
        );
        return { uploaded: results.length, photos: results };
    }

    /**
     * Get photos by tree ID
     */
    @Get('tree/:treeId')
    async getPhotosByTree(
        @Param('treeId') treeId: string,
        @Query('quarter') quarter: string | undefined,
        @Req() req: any,
    ) {
        const workspaceId = req.user?.workspaceId || 'default';
        return this.treePhotoService.findPhotosByTree(
            workspaceId,
            treeId,
            quarter,
        );
    }
}
