import axiosClient from "../axios/axiosClient";

export const getUsersService = async (filters = {}) => {
	const params = {};
	if (filters.search) params.q = filters.search;
	if (filters.role) params.role = filters.role;
	if (filters.status) params.activeStatus = filters.status;
	if (filters.page) params.page = filters.page;
	if (filters.limit) params.limit = filters.limit;

	const res = await axiosClient.get("/api/admin/users", { params });
	return res.data?.data?.users ?? [];
};

// updateUserService is intentionally disabled because UI only supports listing now.
// To re-enable, uncomment and export the function.
// export const updateUserService = async (id, data) => {
// 	const res = await axiosClient.patch(`/api/admin/users/${id}`, data);
// 	return res.data?.data?.user ?? res.data;
// };

export default { getUsersService };
