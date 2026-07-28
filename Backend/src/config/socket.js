import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
// 👇 IMPORT TRỰC TIẾP FILE CORS CỦA ÔNG (Sửa lại đường dẫn path cho đúng cấu trúc thư mục dự án)
import corsOptions from "./corsConfig.js";

let io = null;

export const initSocket = (httpServer) => {
    // 👇 DÙNG LUÔN corsOptions THỰC TẾ: Socket.io chấp nhận hàm origin của file cors tương thích 100%
    io = new Server(httpServer, {
        cors: corsOptions
    });

    io.use(async (socket, next) => {
        try {
            const reqCookies = socket.handshake.headers.cookie;
            let token = socket.handshake.auth?.token;

            if (reqCookies) {
                // Bộ bóc tách cookie nâng cao, giải mã chuẩn chuỗi Cookie của trình duyệt
                const cookies = reqCookies.split(";").reduce((acc, cookie) => {
                    const [key, ...v] = cookie.trim().split("=");
                    if (key) acc[key] = v.join("=");
                    return acc;
                }, {});

                // Quét toàn bộ các tên key cookie thông dụng nhất trong dự án NodeJS
                token = token || cookies.token || cookies.accessToken || cookies.jwt || cookies.session;
            }

            if (!token) {
                // Log ra terminal đen của Backend để ông dễ debug xem nó có chọc được vào đây không
                console.log("🔴 [Socket Auth] Không tìm thấy Token trong Cookie gửi lên.");
                return next(new Error("Authentication error: Token missing."));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.id).select("_id role activeStatus").lean();

            if (!user || user.activeStatus !== "active") {
                return next(new Error("Authentication error: Invalid user."));
            }

            socket.user = { _id: user._id.toString(), role: user.role };
            next();
        } catch (err) {
            console.log("🔴 [Socket Auth] Token bị sai hoặc hết hạn:", err.message);
            return next(new Error("Authentication error: Invalid token."));
        }
    });

    io.on("connection", (socket) => {
        const { _id: userId, role: userRole } = socket.user;
        socket.join(userId);
        if (userRole) socket.join(userRole);
        console.log(`⚡ Socket Connected: User [${userId}] vào phòng thành công.`);

        socket.on("disconnect", () => {
            console.log(`🔌 Socket Disconnected: [${userId}]`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) throw new Error("Socket.io has not been initialized!");
    return io;
};
