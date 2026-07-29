import CustomerReportListPage from "../pages/report/CustomerReportListPage";
import CustomerReportDetailPage from "../pages/report/CustomerReportDetailPage";
import CustomerCreateReportPage from "../pages/report/CustomerCreateReportPage";
import { routePaths } from "./routePaths";

export const userReportRoutes = [
  {
    path: routePaths.userReportList,
    element: <CustomerReportListPage />,
  },
  {
    path: routePaths.userReportDetail(),
    element: <CustomerReportDetailPage />,
  },
  {
    path: routePaths.userCreateReport,
    element: <CustomerCreateReportPage />,
  },
];
