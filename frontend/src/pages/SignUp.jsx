import { useState } from "react";
import eye from "../assets/show.png"
import hide from "../assets/hide.png"
import axios from 'axios'
import { useAuth } from "../context/AuthContext";
import GoogleLogin from "../components/GoogleLogin";
import { Link } from "react-router-dom";

const SignUp = () => {

  const[email,setEmail] = useState("")
  const[password,setPassword] = useState("")
  const[confirmpassword,setConfirmPassword] = useState("")
  const[fullname, setFullName] = useState("")
  const[showpassword, setShowPassword] = useState(false)
  const[showconfirmpassword, setShowConfirmPassword] = useState(false)
  const[loading, setLoading] = useState(false)
  const[apierror, setApiError] = useState("")

  const{login} = useAuth();

  const check_info = async (e) =>{
  
    e.preventDefault();
    if(password !== confirmpassword){
        return;
    }
    setLoading(true)

    const data = {
        "full_name" : fullname,
        "email" : email,
        "password" : password
    }
    try{
        const response = await axios.post(
            "http://localhost:8000/auth/signup", data,
            {
                withCredentials: true
            }
        )
        await login(response.data.access_token);
        setApiError("")
    }
    catch(error){
        setApiError(error.response.data.detail)
        console.log(error.response.data)
    }
    finally{
        setLoading(false)
    }
  }

  const change_email = (e) =>{
    setEmail(e.target.value);
    setApiError("");
  }
  return (
    <div className="min-h-screen flex flex-col justify-center items-center gap-6 ">
        <h1 className="text-4xl sm:text-5xl font-bold font-sans tracking-tight text-white">Create an account</h1>
        <form
        onSubmit={check_info}
        className="bg-white flex flex-col gap-4 border border-black rounded-xl shadow-lg p-6 w-fit mx-auto"
        >

            <div className="flex flex-col gap-1">
                <label htmlFor="fullname" className="text-sm font-medium">Full Name</label>
                <input
                type="text"
                name="fullname"
                id="fullname"
                required
                className="border border-slate-400 rounded-lg px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-blue-500 transition"
                value={fullname}
                onChange={(e) => setFullName(e.target.value)}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                type="email"
                name="email"
                id="email"
                required
                className="border border-slate-400 rounded-lg px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-blue-500 transition"
                value={email}
                onChange={(e) => change_email(e)}
                />
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <div className="flex gap-1 items-center">
                    <input
                    type={showpassword ? "text" : "password"}
                    name="password"
                    id="password"
                    minLength={8}
                    required
                    className="border border-slate-400 rounded-lg px-3 py-2
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500 transition"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    />
                    {showpassword == false && <img src={eye} alt="show password icon" className="h-4 w-auto" onClick={() => setShowPassword(true)}/>}
                    {showpassword == true && <img src={hide} alt="hide password icon" className="h-4 w-auto" onClick={() => setShowPassword(false)}/>}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</label>
                <div className="flex gap-1 items-center">
                    <input
                    type={showconfirmpassword ? "text" : "password"}
                    name="confirmPassword"
                    id="confirmPassword"
                    minLength={8}
                    required
                    className="border border-slate-400 rounded-lg px-3 py-2
                    focus:outline-none focus:ring-2 focus:ring-blue-500
                    focus:border-blue-500 transition"
                    value={confirmpassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {showconfirmpassword == false && <img src={eye} alt="show password icon" className="h-4 w-auto" onClick={() => setShowConfirmPassword(true)}/>}
                    {showconfirmpassword == true && <img src={hide} alt="hide password icon" className="h-4 w-auto" onClick={() => setShowConfirmPassword(false)}/>}
                </div>
            </div>
            {confirmpassword && confirmpassword != password && <span className="text-red-600">Passwords do not match</span>}
            {apierror && <span className="text-red-600">{apierror}</span>}
            <button
                type="submit"
                className="bg-blue-500 text-white cursor-pointer px-3 py-1.5 rounded"
                disabled = {loading || confirmpassword != password}>
                {loading ? "Creating Account..." : "Sign Up"}
            </button>
            <div className="flex items-center gap-3">
                <div className="h-px bg-gray-400 flex-1"></div>
                <span>OR</span>
                <div className="h-px bg-gray-400 flex-1"></div>
            </div>

            <GoogleLogin />
        </form>
        <p className="text-white">
            Already have an account?{" "}
            <Link to="/login" className="text-blue-600 underline">
                Login
            </Link>
        </p>
    </div>
  );
};

export default SignUp;

