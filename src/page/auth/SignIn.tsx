import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { nkClient } from "../../services/nakama-client";
import { toast, ToastContainer, Bounce } from "react-toastify";
import { toastOptions } from "../../utils/toast-options";
import { useAuth } from "../../context/AuthContext";

type SignInForm = {
  email: string;
  password: string;
};

const SignIn: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const { setUser } = useAuth();

  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>();

  const onSubmit = async (data: SignInForm) => {
    try {
      const { email, password } = data;

      // Authenticate directly with Nakama
      const session = await nkClient.authenticateEmail(email, password, false);
      localStorage.setItem("user_session", JSON.stringify(session));

      // Get account information via RPC
      try {
        const response = await nkClient.rpc(session, "get_user_account", {});

        const result = JSON.parse(
          typeof response.payload === "string"
            ? response.payload
            : JSON.stringify(response.payload)
        );

        const sessionWithProfile = {
          ...session,
          email,
          username: result.account.user?.username || email.split('@')[0],
          user_id: session.user_id,
          avatarUrl: result.account.user?.avatar_url || "",
          location: result.account.user?.location || ""
        };
        localStorage.setItem("logged_user", JSON.stringify(sessionWithProfile));
        setUser(sessionWithProfile);
      } catch (accountErr) {
        console.warn("Failed to fetch account data, using basic info:", accountErr);
        const sessionWithEmail = {
          ...session,
          email,
          username: email.split('@')[0],
          user_id: session.user_id,
          location: ""
        };
        localStorage.setItem("logged_user", JSON.stringify(sessionWithEmail));
        setUser(sessionWithEmail);
      }

      toast.success("Signed in successfully!", toastOptions);
      setTimeout(() => navigate("/"), 1000);
    } catch (err: any) {
      if (err.status === 404) {
        toast.info("No account found. Please Sign Up first.", toastOptions);
        setTimeout(() => navigate("/sign-up"), 3000);
        return;
      }
      if (err.status === 400 || err.status === 401) {
        toast.error("Invalid email or password!", toastOptions);
        return;
      }
      toast.error("Server error, Sign in failed", toastOptions);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white px-4">
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
        className="flex flex-col bg-white border border-black p-6 rounded-lg w-full max-w-sm gap-6 shadow-[4px_4px_0px_0px_black]"
      >
        <h1 className="text-3xl font-bold text-center text-black">Sign In</h1>

        <div className="flex flex-col">
          <label className="text-black mb-1 font-semibold">Email</label>
          <input
            {...register("email", { required: "Email is required" })}
            type="email"
            placeholder="Enter email"
            className={`border p-2 rounded-md bg-white text-black ${errors.email ? "border-red-500" : "border-black"
              }`}
          />
          {errors.email && (
            <p className="text-red-500 text-sm">{errors.email.message}</p>
          )}
        </div>

        <div className="flex flex-col">
          <label className="text-black mb-1 font-semibold">Password</label>
          <div className="relative">
            <input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Min 6 characters" },
              })}
              type={showPassword ? "text" : "password"}
              placeholder="Enter password"
              className={`border w-full p-2 pr-10 rounded-md bg-white text-black ${errors.password ? "border-red-500" : "border-black"
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
          className="bg-black text-white py-2 rounded-md hover:bg-gray-900 transition font-semibold"
        >
          {isSubmitting ? "Signing In..." : "Sign In"}
        </button>
        <p
          className="text-center text-black text-sm cursor-pointer underline"
          onClick={() => navigate("/sign-up")}
        >
          Don't have an account? Sign Up
        </p>
      </form>
    </div>
  );
};

export default SignIn;
