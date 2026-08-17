const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const seedPersonnel = require("./seeders/personnel.seed");
const seedUsers = require("./seeders/user.seed");
const seedWarehouses = require("./seeders/warehouse.seed");
const seedProjects = require("./seeders/project.seed");
const seedVehicles = require("./seeders/vehicle.seed");
const seedItems = require("./seeders/item.seed");
const seedBoq = require("./seeders/boq.seed");
const seedSuratJalan = require("./seeders/surat-jalan.seed");

async function main() {
    console.log("========== START SEED ==========");

    await seedUsers(prisma);
    await seedPersonnel(prisma);
    await seedWarehouses(prisma);
    await seedProjects(prisma);
    await seedVehicles(prisma);
    await seedItems(prisma);
    await seedBoq(prisma);
    await seedSuratJalan(prisma);

    console.log("========== SEED SUCCESS ==========");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });