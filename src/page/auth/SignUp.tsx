import React, { Activity, useState } from "react";
import { useForm } from "react-hook-form";
import { FaUser } from "react-icons/fa";
import { Bounce, toast, ToastContainer } from "react-toastify";
import { toastOptions } from "../../utils/toast-options.ts";
import { nkClient } from "../../services/nakama-client";
import { v4 as uuid } from "uuid";
import { useNavigate } from "react-router";
type SignUpForm = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const SignUp: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>();

  const navigate = useNavigate();
  const onSubmit = async (data: SignUpForm) => {
    try {
      const { email, password, username } = data;

      const session = await nkClient.authenticateEmail(
        email,
        password,
        true,
        username
      );

      if (session.created) {
        toast.success("Account created successfully!", toastOptions);
        localStorage.setItem('logged_user',JSON.stringify(session))
        setTimeout(() => {
          navigate("/");
        }, 3000);
      }
      if (!session.created) {
        toast.info("Account already exists. Please sign in.", toastOptions);
      }
    } catch (err: any) {
      toast.error("Registration failed. Please try again.", toastOptions);
    }
  };

  const guestUser = async () => {
    const device_id = uuid();

    try {
      const session = await nkClient.authenticateDevice(device_id, true, "GuestUser");
      toast.success("Logged in as Guest!", toastOptions);
      localStorage.setItem("logged_user",JSON.stringify(session))
      setTimeout(() => {
        navigate("/");
      }, 1200);
    } catch (error: any) {
      toast.error("Guest login failed. Try again.", toastOptions);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4">
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick={false}
        pauseOnHover
        draggable
        theme="colored"
        transition={Bounce}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white border border-black shadow-[4px_4px_0px_0px_black] rounded-lg p-6 w-full max-w-sm flex flex-col gap-5"
      >
        <h1 className="text-3xl font-bold text-center text-black">Sign Up</h1>

        <div className="flex flex-col">
          <label className="font-medium text-black mb-1">Username</label>
          <input
            {...register("username", {
              required: "Username is required",
              minLength: { value: 3, message: "Min 3 characters" },
            })}
            type="text"
            className={`border p-2 rounded-md bg-white text-black ${
              errors.username ? "border-red-500" : "border-black"
            }`}
            placeholder="Enter username"
          />
          <Activity mode={errors.username ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm">{errors.username?.message}</p>
          </Activity>
        </div>

        <div className="flex flex-col">
          <label className="font-medium text-black mb-1">Email</label>
          <input
            {...register("email", {
              required: "Email is required",
              pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email format" },
            })}
            type="email"
            className={`border p-2 rounded-md bg-white text-black ${
              errors.email ? "border-red-500" : "border-black"
            }`}
            placeholder="Enter email"
          />
          <Activity mode={errors.email ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm">{errors.email?.message}</p>
          </Activity>
        </div>

        <div className="flex flex-col">
          <label className="font-medium text-black mb-1">Password</label>
          <div className="relative">
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Min 6 characters" },
              })}
              type={showPassword ? "text" : "password"}
              className={`border w-full p-2 pr-10 rounded-md bg-white text-black ${
                errors.password ? "border-red-500" : "border-black"
              }`}
              placeholder="Enter password"
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 cursor-pointer text-lg"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>
          <Activity mode={errors.password ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm">Password must be at least 6 characters.</p>
          </Activity>
        </div>

        <div className="flex flex-col relative">
          <label className="font-medium text-black mb-1">Confirm Password</label>
          <input
            {...register("confirmPassword", {
              required: "Confirm your password",
              validate: (value) =>
                value === watch("password") || "Passwords do not match",
            })}
            type={showConfirmPassword ? "text" : "password"}
            className={`border p-2 rounded-md bg-white text-black ${
              errors.confirmPassword ? "border-red-500" : "border-black"
            }`}
            placeholder="Re-enter password"
          />

          <span
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-10 cursor-pointer text-lg"
          >
            {showConfirmPassword ? "🙈" : "👁️"}
          </span>

          <Activity mode={errors.confirmPassword ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm mt-1">
              {errors.confirmPassword?.message}
            </p>
          </Activity>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-black text-white py-2 rounded-md hover:bg-gray-900 transition font-semibold"
        >
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </button>

        <button
          type="button"
          className="flex flex-row items-center justify-center gap-2 bg-gray-200 text-black rounded py-2 hover:bg-gray-300"
          onClick={guestUser}
        >
          <FaUser className="text-black" /> Guest user
        </button>

        <p
          className="text-center text-black text-sm underline cursor-pointer"
          onClick={() => (window.location.href = "/sign-in")}
        >
          Already have an account? Sign In
        </p>
      </form>
    </div>
  );
};

export default SignUp;
