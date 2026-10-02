const validate = (schema, source = "body") => {
    return (req, res, next) => {
        const data = source === "query" ? req.query : source === "params" ? req.params : req.body;
        const result = schema.safeParse(data);

        if (!result.success) {
            console.error(
                `VALIDATION FAILED (${source}):\n`,
                JSON.stringify(result.error.flatten().fieldErrors, null, 2)
            );
            return res.status(400).json({
                success: false,
                message: "Validation Error",
                errors: result.error.flatten().fieldErrors,
            });
        }

        if (source === "query") {
            req.query = result.data;
        } else if (source === "params") {
            req.params = result.data;
        } else {
            req.body = result.data;
        }

        next();
    };
};

module.exports = validate;