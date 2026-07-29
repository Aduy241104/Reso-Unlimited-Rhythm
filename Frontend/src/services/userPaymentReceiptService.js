import axiosClient from "../axios/axiosClient";

export const getUserPaymentReceiptPdf = async (paymentId) => {
  const response = await axiosClient.get(`/api/users/payments/${paymentId}/receipt`, {
    responseType: "blob",
  });

  return response.data;
};

export default {
  getUserPaymentReceiptPdf,
};
