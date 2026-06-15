import CustomerCreateReportPage from "../pages/report/CustomerCreateReportPage";
import { routePaths } from "./routePaths";

export const userReportRoutes = [
  {
    path: routePaths.userCreateReport,
    element: <CustomerCreateReportPage />,
  },
];
