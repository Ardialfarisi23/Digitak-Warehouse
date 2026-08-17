const toUserResponse = (user) => {
    return {
        id: String(user.user_id),
        name: user.nama,
        email: user.email,
        role: user.role,
        is_aktif: user.is_aktif,
        created_at: user.created_at ? user.created_at.toISOString() : null,
        updated_at: user.updated_at ? user.updated_at.toISOString() : null,
    };
};

module.exports = {
    toUserResponse
};
