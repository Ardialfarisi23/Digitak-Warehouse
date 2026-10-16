const { strongPasswordSchema } = require("../../src/validators/password.validator");

module.exports = async function seedUsers(prisma) {
    console.log("Seeding users...");

    const isProduction = process.env.NODE_ENV === "production";
    const seedPassword = process.env.SEED_DEFAULT_PASSWORD;
    let defaultPassword;

    if (seedPassword) {
        await strongPasswordSchema.parseAsync(seedPassword);
        defaultPassword = seedPassword;
    } else if (isProduction) {
        throw new Error("SEED_DEFAULT_PASSWORD wajib diisi di production. Seed user dibatalkan.");
    } else {
        defaultPassword = "DevSeed123";
    }

    const admin = await prisma.user_account.upsert({
        where: {
            email: "admin@gmail.com",
        },
        update: {
            nama: "Admin General",
            role: "admin_general",
        },
        create: {
            nama: "Admin General",
            email: "admin@gmail.com",
            password_hash: defaultPassword,
            role: "admin_general",
            is_aktif: true,
        },
    });

    const supervisor = await prisma.user_account.upsert({
        where: {
            email: "supervisor@gmail.com",
        },
        update: {
            nama: "Supervisor Gudang",
            role: "supervisor",
        },
        create: {
            nama: "Supervisor Gudang",
            email: "supervisor@gmail.com",
            password_hash: defaultPassword,
            role: "supervisor",
            is_aktif: true,
        },
    });

    const staff = await prisma.user_account.upsert({
        where: {
            email: "staff@gmail.com",
        },
        update: {
            nama: "Staff Gudang",
            role: "staf_gudang",
        },
        create: {
            nama: "Staff Gudang",
            email: "staff@gmail.com",
            password_hash: defaultPassword,
            role: "staf_gudang",
            is_aktif: true,
        },
    });

    console.log("Users berhasil dibuat:");
    console.log(`- ${admin.nama}`);
    console.log(`- ${supervisor.nama}`);
    console.log(`- ${staff.nama}`);

    return {
        admin,
        supervisor,
        staff,
    };
};