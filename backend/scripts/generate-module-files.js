const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const modules = [
  "aisle",
  "bin",
  "category",
  "customer",
  "item",
  "personnel",
  "projects",
  "rack",
  "supplier",
  "unit",
  "users",
  "vehicle",
  "zone",
];

const singularName = (folderName) => {
  if (folderName === "users") return "user";
  if (folderName === "projects") return "project";
  return folderName;
};

const upperFirst = (value) => value.charAt(0).toUpperCase() + value.slice(1);
const pascalCase = (value) => value.split(/[-_]/).map(upperFirst).join("");

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const writeIfEmpty = (filePath, content) => {
  const exists = fs.existsSync(filePath);
  if (!exists || fs.statSync(filePath).size === 0) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Wrote ${path.relative(root, filePath)}`);
  }
};

const makeValidation = (folderName) => {
  const baseName = singularName(folderName);
  const schemaName = upperFirst(baseName);
  if (folderName === "users") {
    return `const { z } = require("zod");

const create${schemaName}Schema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter.").max(50, "Username maksimal 50 karakter."),
  name: z.string().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter."),
  password: z.string().min(6, "Password minimal 6 karakter."),
  role: z.enum(["ADMIN", "SUPERVISOR", "STAFF"]).optional(),
  warehouseId: z.string().optional(),
});

const update${schemaName}Schema = create${schemaName}Schema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  create${schemaName}Schema,
  update${schemaName}Schema,
};
`;
  }

  return `const { z } = require("zod");

const create${schemaName}Schema = z.object({
  code: z.string().min(3, "Kode minimal 3 karakter.").max(20, "Kode maksimal 20 karakter."),
  name: z.string().min(3, "Nama minimal 3 karakter.").max(100, "Nama maksimal 100 karakter."),
  description: z.string().optional(),
});

const update${schemaName}Schema = create${schemaName}Schema.partial().refine(
  (data) => Object.keys(data).length > 0,
  {
    message: "Minimal satu field harus diupdate.",
  }
);

module.exports = {
  create${schemaName}Schema,
  update${schemaName}Schema,
};
`;
};

const makeRoutes = (folderName) => {
  const baseName = singularName(folderName);
  const upperName = upperFirst(baseName);
  const identifier = folderName === "users" ? "username" : "code";
  return `const express = require("express");

const router = express.Router();

const ${baseName}Controller = require("./${baseName}.controller");

const {
  create${upperName}Schema,
  update${upperName}Schema,
} = require("./${baseName}.validation");

const validate = require("../../middlewares/validation.middleware");
const authenticate = require("../../middlewares/auth.middleware");
const authorize = require("../../middlewares/role.middleware");

router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(create${upperName}Schema),
  ${baseName}Controller.create
);

router.get("/", authenticate, ${baseName}Controller.findAll);
router.get("/:${identifier}", authenticate, ${baseName}Controller.findByCode);
router.put(
  "/:${identifier}",
  authenticate,
  authorize("ADMIN"),
  validate(update${upperName}Schema),
  ${baseName}Controller.update
);
router.delete(
  "/:${identifier}",
  authenticate,
  authorize("ADMIN"),
  ${baseName}Controller.softDelete
);
router.patch(
  "/:${identifier}/restore",
  authenticate,
  authorize("ADMIN"),
  ${baseName}Controller.restore
);

module.exports = router;
`;
};

const makeController = (folderName) => {
  const baseName = singularName(folderName);
  const upperName = upperFirst(baseName);
  const identifier = folderName === "users" ? "username" : "code";
  const label = upperFirst(folderName.replace(/s$/, ""));
  const singular = upperName;
  return `const ${baseName}Service = require("./${baseName}.service");
const response = require("../../shared/response");

const create = async (req, res, next) => {
  try {
    const result = await ${baseName}Service.create(req.body);
    return response.success(res, "${label} berhasil dibuat.", result, 201);
  } catch (err) {
    next(err);
  }
};

const findAll = async (req, res, next) => {
  try {
    const result = await ${baseName}Service.findAll(req.query);
    return response.success(res, "Daftar ${folderName} berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const findByCode = async (req, res, next) => {
  try {
    const result = await ${baseName}Service.findByCode(req.params.${identifier});
    return response.success(res, "Detail ${singular} berhasil diambil.", result);
  } catch (err) {
    next(err);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await ${baseName}Service.update(req.params.${identifier}, req.body);
    return response.success(res, "${label} berhasil diperbarui.", result);
  } catch (err) {
    next(err);
  }
};

const softDelete = async (req, res, next) => {
  try {
    await ${baseName}Service.softDelete(req.params.${identifier});
    return response.success(res, "${label} berhasil dinonaktifkan.");
  } catch (err) {
    next(err);
  }
};

const restore = async (req, res, next) => {
  try {
    const result = await ${baseName}Service.restore(req.params.${identifier});
    return response.success(res, "${label} berhasil dipulihkan.", result);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  create,
  findAll,
  findByCode,
  update,
  softDelete,
  restore,
};
`;
};

const makeRepository = (folderName) => {
  const baseName = singularName(folderName);
  const upperName = upperFirst(baseName);
  const lcModel = folderName === "users" ? "user" : folderName === "projects" ? "project" : folderName;
  const identifier = folderName === "users" ? "username" : "code";
  const findMethod = folderName === "users" ? "findByUsername" : "findByCode";
  const searchFields = folderName === "users" ? ["username", "name"] : ["code", "name", "description"];
  const searchOr = searchFields.map((field) => `      { ${field}: { contains: search, mode: "insensitive" } }`).join(",\n");

  return `const prisma = require("../../config/prisma");

const DEFAULT_LIMIT = 10;
const DEFAULT_PAGE = 1;
const ALLOWED_SORT_FIELDS = ["code", "name", "createdAt", "updatedAt"];

const create = async (data) => {
  return await prisma.${lcModel}.create({
    data,
  });
};

const ${findMethod} = async (${identifier}, options = {}) => {
  if (options.includeInactive) {
    return await prisma.${lcModel}.findUnique({
      where: { ${identifier} },
    });
  }

  return await prisma.${lcModel}.findFirst({
    where: {
      ${identifier},
      isActive: true,
    },
  });
};

const findAll = async ({
  page = DEFAULT_PAGE,
  limit = DEFAULT_LIMIT,
  search,
  sortBy = "createdAt",
  sortOrder = "desc",
  isActive,
} = {}) => {
  const sanitizedPage = Math.max(parseInt(page, 10) || DEFAULT_PAGE, DEFAULT_PAGE);
  const sanitizedLimit = Math.max(parseInt(limit, 10) || DEFAULT_LIMIT, 1);
  const orderField = ALLOWED_SORT_FIELDS.includes(sortBy) ? sortBy : "createdAt";
  const orderDirection = ["asc", "desc"].includes((sortOrder || "").toLowerCase())
    ? sortOrder.toLowerCase()
    : "desc";

  const where = {};

  if (isActive === "true") {
    where.isActive = true;
  } else if (isActive === "false") {
    where.isActive = false;
  } else {
    where.isActive = true;
  }

  if (search) {
    where.OR = [
${searchOr}
    ];
  }

  const total = await prisma.${lcModel}.count({
    where,
  });

  const data = await prisma.${lcModel}.findMany({
    where,
    orderBy: {
      [orderField]: orderDirection,
    },
    skip: (sanitizedPage - 1) * sanitizedLimit,
    take: sanitizedLimit,
  });

  return {
    data,
    meta: {
      total,
      page: sanitizedPage,
      limit: sanitizedLimit,
      totalPages: Math.ceil(total / sanitizedLimit),
    },
  };
};

const update = async (${identifier}, data) => {
  return await prisma.${lcModel}.update({
    where: { ${identifier} },
    data,
  });
};

const softDelete = async (${identifier}) => {
  return await prisma.${lcModel}.update({
    where: { ${identifier} },
    data: { isActive: false },
  });
};

const restore = async (${identifier}) => {
  return await prisma.${lcModel}.update({
    where: { ${identifier} },
    data: { isActive: true },
  });
};

module.exports = {
  create,
  ${findMethod},
  findAll,
  update,
  softDelete,
  restore,
};
`;
};

const makeService = (folderName) => {
  const baseName = singularName(folderName);
  const upperName = upperFirst(baseName);
  const identifier = folderName === "users" ? "username" : "code";
  const findMethod = folderName === "users" ? "findByUsername" : "findByCode";
  const uniqueField = folderName === "users" ? "username" : "code";
  const nicename = upperName;
  const repoName = `${baseName}Repository`;
  const extraImport = folderName === "users" ? `const passwordHelper = require("../../shared/password");\n` : "";
  const extraHash = folderName === "users" ? `  if (data.password) {
    data.password = await passwordHelper.hash(data.password);
  }
` : "";
  const uniqueCheck = folderName === "users"
    ? `  if (data.username && data.username !== username) {
    const existing = await ${repoName}.${findMethod}(data.username, { includeInactive: true });
    if (existing) {
      throw new AppError("Username sudah digunakan.", 400);
    }
  }
`
    : `  if (data.code && data.code !== code) {
    const existing = await ${repoName}.${findMethod}(data.code, { includeInactive: true });
    if (existing) {
      throw new AppError("Kode ${folderName.replace(/s$/, "").toLowerCase()} sudah digunakan.", 400);
    }
  }
`;

  const createBody = folderName === "users"
    ? `  const existing = await ${repoName}.${findMethod}(data.username, { includeInactive: true });

  if (existing) {
    throw new AppError("Username sudah digunakan.", 400);
  }

  if (data.password) {
    data.password = await passwordHelper.hash(data.password);
  }

  return await ${repoName}.create(data);
`
    : `  const existing = await ${repoName}.${findMethod}(data.${uniqueField}, { includeInactive: true });

  if (existing) {
    throw new AppError("Kode ${folderName.replace(/s$/, "").toLowerCase()} sudah digunakan.", 400);
  }

  return await ${repoName}.create(data);
`;

  return `const ${repoName} = require("./${baseName}.repository");
const AppError = require("../../shared/errors");
${extraImport}
const create = async (data) => {
${createBody}};

const findAll = async (query) => {
  return await ${repoName}.findAll(query);
};

const findByCode = async (${identifier}) => {
  const record = await ${repoName}.${findMethod}(${identifier}, { includeInactive: true });

  if (!record) {
    throw new AppError("${nicename} tidak ditemukan.", 404);
  }

  return record;
};

const update = async (${identifier}, data) => {
  const record = await ${repoName}.${findMethod}(${identifier}, { includeInactive: true });

  if (!record) {
    throw new AppError("${nicename} tidak ditemukan.", 404);
  }

  if (!record.isActive) {
    throw new AppError("${nicename} telah dinonaktifkan. Pulihkan untuk mengubah data.", 400);
  }
${extraHash}${uniqueCheck}
  return await ${repoName}.update(${identifier}, data);
};

const softDelete = async (${identifier}) => {
  const record = await ${repoName}.${findMethod}(${identifier}, { includeInactive: true });

  if (!record) {
    throw new AppError("${nicename} tidak ditemukan.", 404);
  }

  if (!record.isActive) {
    throw new AppError("${nicename} sudah dinonaktifkan.", 400);
  }

  return await ${repoName}.softDelete(${identifier});
};

const restore = async (${identifier}) => {
  const record = await ${repoName}.${findMethod}(${identifier}, { includeInactive: true });

  if (!record) {
    throw new AppError("${nicename} tidak ditemukan.", 404);
  }

  if (record.isActive) {
    throw new AppError("${nicename} sudah aktif.", 400);
  }

  return await ${repoName}.restore(${identifier});
};

module.exports = {
  create,
  findAll,
  findByCode,
  update,
  softDelete,
  restore,
};
`;
};

for (const folderName of modules) {
  const moduleDir = path.join(root, "src", "modules", folderName);
  ensureDir(moduleDir);

  const baseName = singularName(folderName);
  const files = {
    [`${baseName}.repository.js`]: makeRepository(folderName),
    [`${baseName}.service.js`]: makeService(folderName),
    [`${baseName}.controller.js`]: makeController(folderName),
    [`${baseName}.routes.js`]: makeRoutes(folderName),
    [`${baseName}.validation.js`]: makeValidation(folderName),
  };

  Object.entries(files).forEach(([fileName, content]) => {
    writeIfEmpty(path.join(moduleDir, fileName), content);
  });
}

console.log("Module scaffolding generation complete.");
