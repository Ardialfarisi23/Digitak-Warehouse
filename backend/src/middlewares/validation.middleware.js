const validate = (schema, source = "body") => {
    return (req, res, next) => {
        const data = source === "query" ? req.query : source === "params" ? req.params : req.body;
        const result = schema.safeParse(data);

        if (!result.success) {
            console.error(
                `VALIDATION FAILED (${source}):\n`,
                JSON.stringify(result.error.flatten().fieldErrors, null, 2)
            );

            const fieldErrors = result.error.flatten().fieldErrors;
            const firstErrorMessage = Object.values(fieldErrors).flat()[0] || "Validation Error";

            return res.status(400).json({
                success: false,
                message: firstErrorMessage,
                errors: fieldErrors,
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