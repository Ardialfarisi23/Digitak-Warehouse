const { PrismaClient } = require("@prisma/client");
const reconciliationRepository = require("./backend/src/modules/reconciliation/reconciliation.repository");

const prisma = new PrismaClient({ 
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/digitak_warehouse"
    }
  }
});

async function testReconciliation() {
  console.log("Testing reconciliation inventory API with groupBy=cluster...");
  
  try {
    // Test with groupBy=cluster
    const result = await reconciliationRepository.getInventory({ groupBy: "cluster", projectId: "17" }, { id: 1, role: "admin" });
    console.log("SUCCESS with projectId=17, groupBy=cluster");
    console.log("Items returned:", result.data?.length || 0);
    if (result.data?.length > 0) {
      console.log("First item:", JSON.stringify(result.data[0], null, 2));
      const totalBoq = result.data.reduce((sum, item) => sum + (item.boq || 0), 0);
      console.log("Total BOQ Plan:", totalBoq);
    }
  } catch (err) {
    console.log("ERROR with projectId=17, groupBy=cluster:");
    console.log(err.message);
    console.log(err.stack);
  }

  try {
    // Test without filter
    const result = await reconciliationRepository.getInventory({ groupBy: "cluster" }, { id: 1, role: "admin" });
    console.log("\nSUCCESS with no filter, groupBy=cluster");
    console.log("Items returned:", result.data?.length || 0);
    if (result.data?.length > 0) {
      console.log("First item:", JSON.stringify(result.data[0], null, 2));
      const totalBoq = result.data.reduce((sum, item) => sum + (item.boq || 0), 0);
      console.log("Total BOQ Plan:", totalBoq);
    }
  } catch (err) {
    console.log("\nERROR with no filter, groupBy=cluster:");
    console.log(err.message);
    console.log(err.stack);
  }

  try {
    // Test with groupBy=project
    const result = await reconciliationRepository.getInventory({ groupBy: "project", projectId: "17" }, { id: 1, role: "admin" });
    console.log("\nSUCCESS with projectId=17, groupBy=project");
    console.log("Items returned:", result.data?.length || 0);
    if (result.data?.length > 0) {
      console.log("First item:", JSON.stringify(result.data[0], null, 2));
      const totalBoq = result.data.reduce((sum, item) => sum + (item.boq || 0), 0);
      console.log("Total BOQ Plan:", totalBoq);
    }
  } catch (err) {
    console.log("\nERROR with projectId=17, groupBy=project:");
    console.log(err.message);
    console.log(err.stack);
  }

  try {
    // Test with groupBy=project (no filter)
    const result = await reconciliationRepository.getInventory({ groupBy: "project" }, { id: 1, role: "admin" });
    console.log("\nSUCCESS with no filter, groupBy=project");
    console.log("Items returned:", result.data?.length || 0);
    if (result.data?.length > 0) {
      console.log("First item:", JSON.stringify(result.data[0], null, 2));
      const totalBoq = result.data.reduce((sum, item) => sum + (item.boq || 0), 0);
      console.log("Total BOQ Plan:", totalBoq);
    }
  } catch (err) {
    console.log("\nERROR with no filter, groupBy=project:");
    console.log(err.message);
    console.log(err.stack);
  }

  await prisma.$disconnect();
}

testReconciliation().catch(console.error);