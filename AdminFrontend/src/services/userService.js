import axiosClient from "../axios/axiosClient";

const buildUserParams = (filters = {}) => {
	const params = {};
	const search = filters.search ?? filters.q;
	if (search) params.q = search;
	if (filters.role) params.role = filters.role;
	if (filters.status) params.activeStatus = filters.status;
	if (filters.excludeRole) params.excludeRole = filters.excludeRole;
	if (filters.page) params.page = filters.page;
	if (filters.limit) params.limit = filters.limit;
	return params;
};

export const getUsersPageService = async (filters = {}) => {
	const res = await axiosClient.get("/api/admin/users", { params: buildUserParams(filters) });
	return {
		users: res.data?.data?.users ?? [],
		meta: res.data?.meta ?? null,
	};
};

export const getUsersService = async (filters = {}) => {
	const result = await getUsersPageService(filters);
	return result.users;
};

export const getUserService = async (id) => {
	const res = await axiosClient.get(`/api/admin/users/${id}`);
	return res.data?.data?.user ?? null;
};

export const getUserModerationAuditService = async (id) => {
	const res = await axiosClient.get(`/api/admin/users/${id}/moderation-audit`);
	return res.data?.data?.auditLogs ?? [];
};

export const updateUserService = async (id, data) => {
	const res = await axiosClient.patch(`/api/admin/users/${id}`, data);
	return res.data?.data?.user ?? res.data;
};

export default { getUsersService, getUsersPageService, getUserService, getUserModerationAuditService, updateUserService };
