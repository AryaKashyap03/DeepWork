import { useState} from "react"
import { useAuth } from "../context/AuthContext";
import GoogleLogin from "../components/GoogleLogin";
import { Link } from "react-router-dom";
import axios from 'axios'

const Login = () => {

    const[email,setEmail] = useState("")
    const[password, setPassword] = useState("")
    const[showpasswordempty, setShowPasswordEmpty] = useState(false)
    const[errormessage, setErrorMessage] = useState("")

    const { login } = useAuth();

    const check_info = async (e) => {
        e.preventDefault();

        if(!password){
            setShowPasswordEmpty(true);
            return;
        }
        const data = `username=${email}&password=${password}`
        try{
            const response = await axios.post(
                "http://localhost:8000/auth/login", data,
                {
                    withCredentials: true
                }
            )
            await login(response.data.access_token);
        }
        catch(error){
            setErrorMessage(error.response.data.detail)
            console.log(error.response.data)
        }
    }
    const password_change = (e) =>{
        setPassword(e.target.value);
        setShowPasswordEmpty(false);
        setErrorMessage("")
    }

    return (
    <>
    <div className="min-h-screen flex flex-col justify-center items-center gap-10">
        <h1 className="text-4xl sm:text-5xl font-bold font-sans tracking-tight text-white">Login to your account</h1>
        <form className="bg-white flex flex-col gap-4 border border-slate-600 rounded-xl shadow-lg p-6 w-fit mx-auto" onSubmit={check_info}>
            <div className="flex flex-col gap-1">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input type="email" id="email" name="email" required 
                className="border border-slate-400 rounded-lg px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-blue-500 transition"
                value = {email}
                onChange={(e) => setEmail(e.target.value)}/>
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="password" className="text-sm font-medium">Password</label>
                <input type="password" id="password" name="email" required
                className="border border-slate-400 rounded-lg px-3 py-2
                focus:outline-none focus:ring-2 focus:ring-blue-500
                focus:border-blue-500 transition"
                value = {password}
                onChange={(e) => password_change(e)}/>
            </div>
            {showpasswordempty && <span className="text-red-600">Password cannot be empty</span>}
            {errormessage && <span className="text-red-600">{errormessage}</span>}
            <button type="submit" className="bg-blue-500 text-white cursor-pointer px-3 py-1.5 rounded">Login</button>
            <div className="flex items-center gap-3">
                <div className="h-px bg-gray-400 flex-1"></div>
                <span>OR</span>
                <div className="h-px bg-gray-400 flex-1"></div>
            </div>

            <GoogleLogin />
        </form>
        <p className="text-white">
            Don't have an account?{" "}
            <Link to="/signup" className="text-blue-600 underline">
                Sign up
            </Link>
        </p>
    </div>
    </>
    )
}

export default Login