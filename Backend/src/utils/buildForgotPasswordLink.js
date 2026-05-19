export const buildResetLink = ({ token }) => {
    const base = process.env.FRONTEND_URL || "http://localhost:5173";
    const path = process.env.RESET_PASSWORD_PATH || "/reset-password";

    const url = new URL(path, base);
    url.searchParams.set("token", token);
    return url.toString();
};
