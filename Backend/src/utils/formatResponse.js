const success = (res, data = null, message = "Success", meta = null) => {
    return res.status(200).json({
        success: true,
        message,
        data,
        meta,
        errors: null,
        timestamp: new Date().toISOString()
    });
};

const error = (res, message = "Error", status = 500, errors = null) => {
    return res.status(status).json({
        success: false,
        message,
        data: null,
        meta: null,
        errors,
        timestamp: new Date().toISOString()
    });
};

export default { success, error };