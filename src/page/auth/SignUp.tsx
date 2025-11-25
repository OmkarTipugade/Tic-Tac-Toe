import React, { Activity, useState } from "react";
import { useForm } from "react-hook-form";
import { Bounce, toast, ToastContainer } from "react-toastify";
import { toastOptions } from "../../utils/toast-options.ts";
import { nkClient } from "../../services/nakama-client";
import { useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import countries from "../../utils/countries";

type SignUpForm = {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
};

const SignUp: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const { setUser } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>();

  const navigate = useNavigate();
  const onSubmit = async (data: SignUpForm) => {
    try {
      const { email, password, username, country } = data;

      // Authenticate directly with Nakama (creates account if create=true)
      const session = await nkClient.authenticateEmail(
        email,
        password,
        true,
        username
      );
      localStorage.setItem("user_session", JSON.stringify(session));

      // Update location/country via RPC
      if (country) {
        try {
          await nkClient.rpc(session, "update_user_profile", {
            username: username,
            display_name: username,
            location: country
          });
        } catch (locationErr) {
          console.warn("Failed to set location:", locationErr);
        }
      }

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
          username: result.account.user?.username || username,
          user_id: session.user_id,
          location: result.account.user?.location || country || ""
        };

        if (session.created) {
          toast.success("Account created successfully!", toastOptions);
          localStorage.setItem('logged_user', JSON.stringify(sessionWithProfile))
          setUser(sessionWithProfile);
          setTimeout(() => {
            navigate("/");
          }, 3000);
        } else {
          toast.info("Account already exists. Signing you in...", toastOptions);
          localStorage.setItem('logged_user', JSON.stringify(sessionWithProfile))
          setUser(sessionWithProfile);
          setTimeout(() => {
            navigate("/");
          }, 2000);
        }
      } catch (accountErr) {
        console.warn("Failed to fetch account data, using basic info:", accountErr);
        const sessionWithBasic = {
          ...session,
          email,
          username: username,
          user_id: session.user_id,
          location: country || ""
        };
        localStorage.setItem('logged_user', JSON.stringify(sessionWithBasic))
        setUser(sessionWithBasic);

        if (session.created) {
          toast.success("Account created successfully!", toastOptions);
        } else {
          toast.info("Account already exists. Signing you in...", toastOptions);
        }
        setTimeout(() => navigate("/"), 2000);
      }
    } catch (err: any) {
      console.error("Signup error:", err);

      if (err.status ===400) {
        toast.error("User already exists. Please sign in instead.", toastOptions);
        setTimeout(() => navigate("/sign-in"), 2000);
      } else if (err.status === 409) {
        toast.error("User already exists. Please sign in instead.", toastOptions);
        setTimeout(() => navigate("/sign-in"), 2000);
      } else {
        toast.error(err.message || "Registration failed. Please try again.", toastOptions);
      }
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
            className={`border p-2 rounded-md bg-white text-black ${errors.username ? "border-red-500" : "border-black"
              }`}
            placeholder="Enter username"
          />
          <Activity mode={errors.username ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm">{errors.username?.message}</p>
          </Activity>
        </div>

        <div className="flex flex-col">
          <label className="font-medium text-black mb-1">Country</label>
          <select
            {...register("country", { required: "Country is required" })}
            className={`border p-2 rounded-md bg-white text-black ${errors.country ? "border-red-500" : "border-black"}`}
            onChange={(e) => setCountrySearch(e.target.value)}
          >
            <option value="">Select your country</option>
            {countries
              .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
              .map((country, index) => (
                <option key={index} value={country.name}>
                  {country.flag} {country.name}
                </option>
              ))}
          </select>
          <Activity mode={errors.country ? "visible" : "hidden"}>
            <p className="text-red-500 text-sm">{errors.country?.message}</p>
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
            className={`border p-2 rounded-md bg-white text-black ${errors.email ? "border-red-500" : "border-black"
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
              className={`border w-full p-2 pr-10 rounded-md bg-white text-black ${errors.password ? "border-red-500" : "border-black"
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
            className={`border p-2 rounded-md bg-white text-black ${errors.confirmPassword ? "border-red-500" : "border-black"
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
