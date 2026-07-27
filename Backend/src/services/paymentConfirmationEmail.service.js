import Transaction from "../models/Transaction.js";
import User from "../models/User.js";
import { sendPremiumPaymentSuccessEmail } from "../utils/mailer.js";

const getErrorMessage = (error) =>
    String(error?.message || "Could not send payment confirmation email.")
        .trim()
        .slice(0, 1000);

const sendPremiumPaymentConfirmationEmail = async ({
    transaction,
    subscription,
    planSnapshot,
    user: providedUser = null,
}) => {
    if (!transaction?._id || !subscription || !planSnapshot) {
        return {
            sent: false,
            reason: "missing_payment_context",
        };
    }

    const attemptAt = new Date();
    let claimedTransaction;

    try {
        claimedTransaction = await Transaction.findOneAndUpdate(
            {
                _id: transaction._id,
                confirmationEmailStatus: { $nin: ["sending", "sent"] },
            },
            {
                $set: {
                    confirmationEmailStatus: "sending",
                    confirmationEmailLastAttemptAt: attemptAt,
                    confirmationEmailError: "",
                },
            },
            { new: true }
        );
    } catch (error) {
        const errorMessage = getErrorMessage(error);

        console.error("Failed to claim premium confirmation email:", error);

        return {
            sent: false,
            reason: "claim_failed",
            error: errorMessage,
        };
    }

    if (!claimedTransaction) {
        return {
            sent: false,
            reason: "already_sent_or_in_progress",
        };
    }

    try {
        const user = providedUser || await User.findById(transaction.userId).lean();

        if (!user?.email) {
            throw new Error("User email is unavailable.");
        }

        await sendPremiumPaymentSuccessEmail({
            to: user.email,
            fullName: user.profile?.fullName || user.username || "",
            planName: planSnapshot.name,
            amount: transaction.amount,
            tax: transaction.tax,
            totalAmount: transaction.totalAmount,
            currency: transaction.currency,
            invoiceNumber: transaction.invoiceNumber,
            paymentMethod: transaction.paymentMethod,
            paidAt: transaction.paidAt,
            startDate: subscription.startDate,
            endDate: subscription.endDate,
        });

        const sentAt = new Date();

        await Transaction.updateOne(
            { _id: transaction._id },
            {
                $set: {
                    confirmationEmailStatus: "sent",
                    confirmationEmailSentAt: sentAt,
                    confirmationEmailError: "",
                },
            }
        );

        return {
            sent: true,
            sentAt,
        };
    } catch (error) {
        const errorMessage = getErrorMessage(error);

        await Transaction.updateOne(
            { _id: transaction._id },
            {
                $set: {
                    confirmationEmailStatus: "failed",
                    confirmationEmailError: errorMessage,
                },
            }
        ).catch(() => null);

        console.error("Failed to send premium payment confirmation email:", error);

        return {
            sent: false,
            reason: "send_failed",
            error: errorMessage,
        };
    }
};

export { sendPremiumPaymentConfirmationEmail };

export default {
    sendPremiumPaymentConfirmationEmail,
};
