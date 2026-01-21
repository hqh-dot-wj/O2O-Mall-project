import { Module } from '@nestjs/common';
import { ClientProductController } from './product.controller';
import { ClientProductService } from './product.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ClientProductController],
    providers: [ClientProductService],
    exports: [ClientProductService]
})
export class ClientProductModule { }
