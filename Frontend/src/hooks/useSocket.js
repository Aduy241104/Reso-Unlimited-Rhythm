import { useState, useEffect } from "react";
import { io } from "socket.io-client";

export const useSocket = (accessToken) => {
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        if (!accessToken) return;


        const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:8080";

        const socketInstance = io(SOCKET_URL, {
            auth: { token: accessToken }
        });

        setSocket(socketInstance);

        return () => {
            socketInstance.disconnect();
        };
    }, [accessToken]);

    return socket;
};