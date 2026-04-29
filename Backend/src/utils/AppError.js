export class AppError extends Error {
    constructor (message, statusCode, details = null) {
        // Gọi super(message) để truyền message cho class Error gốc
        super(message);

        this.statusCode = statusCode;
        this.details = details;

        // Đánh dấu đây là lỗi do chúng ta chủ động ném ra (lỗi nghiệp vụ)
        this.isOperational = true;

        // Giữ lại stack trace để dễ debug (không bắt buộc nhưng khuyên dùng)
        Error.captureStackTrace(this, this.constructor);
    }
}