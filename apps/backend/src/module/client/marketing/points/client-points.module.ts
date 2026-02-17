import { Module } from '@nestjs/common';
import { PointsAccountModule } from 'src/module/marketing/points/account/account.module';
import { PointsSigninModule } from 'src/module/marketing/points/signin/signin.module';
import { PointsTaskModule } from 'src/module/marketing/points/task/task.module';
import { ClientPointsAccountController } from './client-points-account.controller';
import { ClientPointsSigninController } from './client-points-signin.controller';
import { ClientPointsTaskController } from './client-points-task.controller';

@Module({
  imports: [PointsAccountModule, PointsSigninModule, PointsTaskModule],
  controllers: [
    ClientPointsAccountController,
    ClientPointsSigninController,
    ClientPointsTaskController,
  ],
})
export class ClientPointsModule {}
