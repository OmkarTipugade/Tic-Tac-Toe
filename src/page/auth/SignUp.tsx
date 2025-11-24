import React, { Activity, useState } from "react";
import { useForm } from "react-hook-form";
import { FaUser } from "react-icons/fa";
import { Bounce, toast, ToastContainer } from "react-toastify";
import { toastOptions } from "../../utils/toast-options.ts";
import { nkClient } from "../../services/nakama-client";
import { v4 as uuid } from "uuid";
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
        setTimeout(() => {
          window.location.href = "/";
        }, 3000);
      } 
      if(!session.created) {
        toast.info("Account already exists. Please sign in.", toastOptions);
      }
    } catch (err: any) {
      toast.error("Registration failed. Please try again.", toastOptions);
    }
  };

  const guestUser = async () => {
    const device_id = uuid();

    try {
      await nkClient.authenticateDevice(
        device_id,
        true, 
        "GuestUser" 
      );

      toast.success("Logged in as Guest!", toastOptions);

      // Redirect AFTER toast shows
      setTimeout(() => {
        window.location.href = "/";
      }, 1200);
    } catch (error: any) {
      console.error(error);
      toast.error("Guest login failed. Try again.", toastOptions);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Bounce}
      />
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white border border-gray-300 shadow-md rounded-lg p-6 w-full max-w-sm flex flex-col gap-5"
      >
        <h1 className="text-3xl font-bold text-center">Create Account</h1>

        <div className="flex flex-col">
          <label className="font-medium text-gray-700 mb-1">Username</label>
          <input
            {...register("username", {
              required: "Username is required",
              minLength: { value: 3, message: "Min 3 characters" },
            })}
            type="text"
            className={`border p-2 rounded-md ${
              errors.username ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter username"
          />
          <Activity mode={errors.username ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm">{errors.username?.message}</p>
          </Activity>
        </div>

        <div className="flex flex-col">
          <label className="font-medium text-gray-700 mb-1">Email</label>
          <input
            {...register("email", {
              required: "Email is required",
              pattern: {
                value: /\S+@\S+\.\S+/,
                message: "Invalid email format",
              },
            })}
            type="email"
            className={`border p-2 rounded-md ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter email"
          />
          <Activity mode={errors.email ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm">{errors.email?.message}</p>
          </Activity>
        </div>

        <div className="flex flex-col">
          <label className="font-medium text-gray-700 mb-1">Password</label>
          <div className="relative">
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Min 6 characters" },
              })}
              type={showPassword ? "text" : "password"}
              className={`border w-full p-2 pr-10 rounded-md ${
                errors.password ? "border-red-500" : "border-gray-300"
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
            <p className="text-red-500 text-sm">
              Password must be at least 6 characters.
            </p>
          </Activity>
        </div>

        <div className="flex flex-col relative">
          <label className="font-medium text-gray-700 mb-1">
            Confirm Password
          </label>

          <input
            {...register("confirmPassword", {
              required: "Confirm your password",
              validate: (value) =>
                value === watch("password") || "Passwords do not match",
            })}
            type={showConfirmPassword ? "text" : "password"}
            className={`border p-2 rounded-md ${
              errors.confirmPassword ? "border-red-500" : "border-gray-300"
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
          className="bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition font-semibold"
        >
          {isSubmitting ? "Creating account..." : "Sign Up"}
        </button>
        <button
          type="button"
          className="flex flex-row items-center justify-center cursor-pointer gap-2 border border-transparent bg-gray-300 rounded py-2"
          onClick={guestUser}
        >
          <FaUser className="text-gray-500" /> Guest user
        </button>

        <p
          className="text-center text-gray-600 text-sm cursor-pointer hover:text-blue-600"
          onClick={() => (window.location.href = "/sign-in")}
        >
          Already have an account? Sign In
        </p>
      </form>
    </div>
  );
};

export default SignUp;
