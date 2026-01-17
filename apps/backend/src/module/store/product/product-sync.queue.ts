import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bull';
import { PrismaService } from 'src/prisma/prisma.service';

export const PRODUCT_SYNC_QUEUE = 'product-sync';

@Injectable()
export class ProductSyncProducer {
    constructor(@InjectQueue(PRODUCT_SYNC_QUEUE) private readonly productSyncQueue: Queue) { }

    /**
     * Notify that a global product has been taken off-shelf.
     * All tenant products should be updated to OFF_SHELF status synchronously or asynchronously.
     */
    async notifyOffShelf(productId: string) {
        await this.productSyncQueue.add('off-shelf', { productId });
    }

    // Future: notifySpecChange, etc.
}

@Processor(PRODUCT_SYNC_QUEUE)
export class ProductSyncConsumer {
    private readonly logger = new Logger(ProductSyncConsumer.name);

    constructor(private readonly prisma: PrismaService) { }

    @Process('off-shelf')
    async handleOffShelf(job: Job<{ productId: string }>) {
        const { productId } = job.data;
        this.logger.log(`Processing off-shelf sync for productId: ${productId}`);

        try {
            // Batch update all tenant products associated with this global product
            const result = await this.prisma.pmsTenantProduct.updateMany({
                where: { productId },
                data: { status: 'OFF_SHELF' },
            });

            this.logger.log(`Synced off-shelf status for ${result.count} tenant products.`);
        } catch (error) {
            this.logger.error(`Failed to sync off-shelf for productId: ${productId}`, error);
            throw error;
        }
    }
}
