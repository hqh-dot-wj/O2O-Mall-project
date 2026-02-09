import { Test, TestingModule } from '@nestjs/testing';
import { RegionService } from './src/module/lbs/region/region.service';
import { StationService } from './src/module/lbs/station/station.service';
import { GeoService } from './src/module/lbs/geo/geo.service';
import { LbsModule } from './src/module/lbs/lbs.module';
import { PrismaModule } from './src/prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './src/config/index';
import { AppConfigModule } from './src/config/app-config.module';
import { Logger } from '@nestjs/common';
import { validate } from './src/config/env.validation';

async function bootstrap() {
  const logger = new Logger('LBS-Verification');

  // Create isolated module to avoid loading Redis/Bull from AppModule
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        cache: true,
        load: [configuration],
        isGlobal: true,
        validate,
        envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
      }),
      AppConfigModule,
      PrismaModule, // Real DB connection
      LbsModule,
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  try {
    const regionService = app.get(RegionService);
    const stationService = app.get(StationService);
    const geoService = app.get(GeoService);

    console.log('\n================ VERIFICATION START ================\n');

    // 1. Verify Region Seeding
    logger.log('Checking Region Data...');
    const provinces = await regionService.getChildren(); // Get level 1
    if (provinces.length > 0) {
      logger.log(`✅ Region Seeding Success. Found ${provinces.length} provinces.`);
      console.log('Sample Province:', provinces[0].name);
    } else {
      logger.error('❌ No regions found. Seeding might have failed or is in progress.');
    }

    // 2. Verify Geo/Station Creation
    logger.log('Testing Station & Fence Creation...');
    const tenantId = 'TEST_TENANT_001';

    // Create a station with a fence around "Changsha Wuyi Square" roughly
    const testStation = {
      tenantId,
      name: 'Verification Station',
      address: 'Test Address',
      latitude: 28.2,
      longitude: 112.9,
      fence: {
        // Create a simple box polygon
        coordinates: [
          [
            [112.9, 28.1],
            [113.0, 28.1],
            [113.0, 28.2],
            [112.9, 28.2],
            [112.9, 28.1],
          ],
        ],
      },
    };

    const createdStation = await stationService.create(testStation);
    if (createdStation && createdStation.stationId) {
      logger.log(`✅ Station Created: ID ${createdStation.stationId}, Name: ${createdStation.name}`);
    } else {
      logger.error('❌ Station creation failed.');
    }

    // 3. Verify Point in Polygon
    logger.log('Testing Point-in-Polygon Check...');
    // Point inside center of box (112.95, 28.15)
    const pointInside = { lat: 28.15, lng: 112.95 };
    const resultInside = await stationService.findNearby(pointInside.lat, pointInside.lng);

    if (resultInside && resultInside.stationId === createdStation.stationId) {
      logger.log(
        `✅ Inside Check Passed: Point (${pointInside.lat}, ${pointInside.lng}) is inside station ${resultInside.name}`,
      );
    } else {
      logger.error(`❌ Inside Check Failed: Expected ${createdStation.name}, got ${JSON.stringify(resultInside)}`);
    }

    // Point outside (112.95, 28.5)
    const pointOutside = { lat: 28.5, lng: 112.95 };
    const resultOutside = await stationService.findNearby(pointOutside.lat, pointOutside.lng);

    if (resultOutside === null) {
      logger.log(`✅ Outside Check Passed: Point (${pointOutside.lat}, ${pointOutside.lng}) is outside.`);
    } else {
      logger.error(`❌ Outside Check Failed: Expected null, got ${JSON.stringify(resultOutside)}`);
    }

    console.log('\n================ VERIFICATION END ================\n');
  } catch (error) {
    logger.error('Verification failed', error);
  } finally {
    await app.close();
  }
}

bootstrap();
