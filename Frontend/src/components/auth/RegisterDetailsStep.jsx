import { Link } from "react-router-dom";
import AuthCard from "./AuthCard";
import AuthField from "./AuthField";

const RegisterDetailsStep = ({ form, onSubmit, apiError }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <AuthCard
      title="Tạo tài khoản mới"
      subtitle="Nhập thông tin cơ bản để hệ thống gửi OTP xác minh email. Mật khẩu sẽ được lưu tạm an toàn ở BE cho đến khi bạn xác thực thành công."
      footer={
        <span>
          Đã có tài khoản?{" "}
          <Link className="font-semibold text-cyan-700" to="/login">
            Đăng nhập
          </Link>
        </span>
      }
    >
      <form className="space-y-4" noValidate onSubmit={handleSubmit(onSubmit)}>
        {apiError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {apiError}
          </div>
        ) : null}

        <AuthField
          label="Họ và tên"
          placeholder="Nguyen Van A"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <AuthField
          label="Email"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthField
          label="Mật khẩu"
          type="password"
          placeholder="Nhap mat khau"
          autoComplete="new-password"
          helperText="Tối thiểu 6 ký tự theo đúng rule hiện tại của BE."
          error={errors.password?.message}
          {...register("password")}
        />

        <AuthField
          label="Nhập lại mật khẩu"
          type="password"
          placeholder="Nhap lai mat khau"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        <button
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Đang gửi OTP..." : "Gửi OTP"}
        </button>
      </form>
    </AuthCard>
  );
};

export default RegisterDetailsStep;
