const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10;

const hash = async (password) => {
    return await bcrypt.hash(
        password,
        SALT_ROUNDS
    );
};

const compare = async (
    password,
    hashedPassword
) => {

    return await bcrypt.compare(
        password,
        hashedPassword
    );

};

module.exports = {

    hash,

    compare

};