module.exports = async function seedUsers(prisma) {
    console.log("Seeding users...");

    const admin = await prisma.user_account.upsert({
        where: {
            email: "admin@gmail.com",
        },
        update: {
            nama: "Admin General",
            role: "admin_general",
            is_aktif: true,
        },
        create: {
            nama: "Admin General",
            email: "admin@gmail.com",
            password_hash: "123456",
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
            is_aktif: true,
        },
        create: {
            nama: "Supervisor Gudang",
            email: "supervisor@gmail.com",
            password_hash: "123456",
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
            is_aktif: true,
        },
        create: {
            nama: "Staff Gudang",
            email: "staff@gmail.com",
            password_hash: "123456",
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