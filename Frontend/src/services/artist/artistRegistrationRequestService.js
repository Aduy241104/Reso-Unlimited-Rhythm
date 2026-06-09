import axiosClient from "../../axios/axiosClient";

const ARTIST_REGISTRATION_API_PREFIX = "/api/users";

export const createArtistRegistrationRequestService = async (payload = {}) => {
    const formData = new FormData();

    const appendIfValid = (key, value) => {
        if (value !== undefined && value !== null) {
            formData.append(key, typeof value === "string" ? value.trim() : value);
        }
    };

    appendIfValid("stageName", payload.stageName);
    appendIfValid("bio", payload.bio);
    appendIfValid("avatar", payload.avatar);
    appendIfValid("fullName", payload.fullName);
    appendIfValid("idNumber", payload.idNumber);
    appendIfValid("dateOfBirth", payload.dateOfBirth);
    appendIfValid("frontImage", payload.frontImage);
    appendIfValid("backImage", payload.backImage);

    if (Array.isArray(payload.genres)) {
        payload.genres.forEach((genre) => formData.append("genres", genre));
    }

    Object.entries(payload.socialLinks ?? {}).forEach(([key, value]) => {
        appendIfValid(`socialLinks[${key}]`, value);
    });

    if (Array.isArray(payload.demoTrackUrls)) {
        payload.demoTrackUrls.forEach((url) => formData.append("demoTrackUrls", url));
    }

    if (Array.isArray(payload.musicLinks)) {
        payload.musicLinks.forEach((link) => formData.append("musicLinks", link));
    }

    appendIfValid("portfolioDescription", payload.portfolioDescription);
    appendIfValid("acceptedTerms", payload.acceptedTerms ? "true" : "false");
    appendIfValid(
        "copyrightCommitment",
        payload.copyrightCommitment ? "true" : "false"
    );
    appendIfValid(
        "truthfulInformationCommitment",
        payload.truthfulInformationCommitment ? "true" : "false"
    );

    const response = await axiosClient.post(
        `${ARTIST_REGISTRATION_API_PREFIX}/artist-registration-requests`,
        formData,
        {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        }
    );

    return response?.data?.data?.artistRequest ?? null;
};
