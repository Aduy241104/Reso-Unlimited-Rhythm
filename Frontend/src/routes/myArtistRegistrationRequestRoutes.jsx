import MyArtistRegistrationRequestsPage from "../pages/artistRegistrationRequest/MyArtistRegistrationRequestsPage";
import MyArtistRegistrationRequestDetailPage from "../pages/artistRegistrationRequest/MyArtistRegistrationRequestDetailPage";
import { routePaths } from "./routePaths";

export const myArtistRegistrationRequestRoutes = [
    {
        path: routePaths.artistRegistrationRequestsList,
        element: <MyArtistRegistrationRequestsPage />,
    },
    {
        path: routePaths.artistRegistrationRequestsDetail(),
        element: <MyArtistRegistrationRequestDetailPage />,
    },
];
