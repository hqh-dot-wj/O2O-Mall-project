
import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('Enabling PostGIS extension...');
        await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');
        console.log('✅ PostGIS extension enabled.');
    } catch (e) {
        console.error('❌ Failed to enable PostGIS:', e);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
