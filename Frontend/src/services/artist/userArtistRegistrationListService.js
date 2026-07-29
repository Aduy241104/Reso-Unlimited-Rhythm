import axiosClient from "../../axios/axiosClient";

const ARTIST_REGISTRATION_LIST_API_PREFIX = "/api/users/artist-registration-requests";

export const getMyArtistRegistrationRequestsService = async (params = {}, config = {}) => {
    const { data } = await axiosClient.get(ARTIST_REGISTRATION_LIST_API_PREFIX, {
        params,
        ...config,
    });
    return data;
};

export const getMyArtistRegistrationRequestDetailService = async (requestId) => {
    const { data } = await axiosClient.get(
        `${ARTIST_REGISTRATION_LIST_API_PREFIX}/${requestId}`
    );
    return data;
};

export const cancelArtistRegistrationRequestService = async (requestId) => {
    const { data } = await axiosClient.delete(
        `${ARTIST_REGISTRATION_LIST_API_PREFIX}/${requestId}`
    );
    return data;
};
