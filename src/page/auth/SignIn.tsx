import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { IoLogoFacebook, IoLogoGoogle } from "react-icons/io5";
import { useNavigate } from "react-router";
import { nkClient } from "../../services/nakama-client";
import { toast, ToastContainer, Bounce } from "react-toastify";
import { toastOptions } from "../../utils/toast-options";

type SignInForm = {
  email: string;
  password: string;
};

const SignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>();

  const onSubmit = async (data: SignInForm) => {
    try {
      const { email, password } = data;

      await nkClient.authenticateEmail(email, password, false);

      toast.success("Signed in successfully!", toastOptions);
      setTimeout(() => navigate("/"), 1000);

    } catch (err: any) {
      if (err.status === 404) {
        toast.info("No account found. Please Sign Up first.", toastOptions);
        setTimeout(() => navigate("/sign-up"), 3000);
        return;
      }
      if(err.status ===401) {
        toast.error("Invalid email or password!", toastOptions);
        console.error("Sign in error:", err);
        return;
      }
      toast.error("Server error, Sign in failed",toastOptions);
      console.log(err);
      return;
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
        transition={Bounce}
      />

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col bg-white shadow-md p-6 rounded-lg w-full max-w-sm gap-6"
      >
        <h1 className="text-3xl font-bold text-center">Sign In</h1>

        {/* Email */}
        <div className="flex flex-col">
          <label className="text-gray-700 mb-1 font-semibold">Email</label>
          <input
            {...register("email", { required: "Email is required" })}
            type="email"
            placeholder="Enter email"
            className={`border p-2 rounded-md ${
              errors.email ? "border-red-500" : "border-gray-300"
            }`}
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-gray-700 mb-1 font-semibold">Password</label>
          <div className="relative">
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Min 6 characters" },
              })}
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className={`border w-full p-2 pr-10 rounded-md ${
                errors.password ? "border-red-500" : "border-gray-300"
              }`}
            />
            <span
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 cursor-pointer text-lg"
            >
              {showPassword ? "🙈" : "👁️"}
            </span>
          </div>

          {errors.password && (
            <p className="text-red-500 text-sm">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition font-semibold"
        >
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>

        <p className="text-center text-gray-500 text-sm hover:text-blue-600 cursor-pointer">
          Forgot Password?
        </p>

        {/* <div className="flex flex-row justify-evenly">
          <button type="button" className="cursor-pointer text-3xl text-red-500">
            <IoLogoGoogle />
          </button>
          <button type="button" className="cursor-pointer text-3xl text-blue-500">
            <IoLogoFacebook />
          </button>
        </div> */}

        <p
          className="text-center text-gray-600 text-sm cursor-pointer hover:text-blue-600"
          onClick={() => navigate("/sign-up")}
        >
          Don't have an account? Sign Up
        </p>

      </form>
    </div>
  );
};

export default SignIn;
