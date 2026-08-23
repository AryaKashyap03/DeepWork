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
    <div className="min-h-screen flex flex-col justify-center items-center gap-10 bg-cyan-100">
        <h1 className="text-6xl font-bold font-sans">Login</h1>
        <form className="flex flex-col gap-4 border border-black p-6 w-fit mx-auto" onSubmit={check_info}>
            <div className="flex flex-col gap-1">
                <label htmlFor="email">Email</label>
                <input type="email" id="email" name="email" 
                className="border border-black px-2 py-1"
                value = {email}
                onChange={(e) => setEmail(e.target.value)}/>
            </div>
            <div className="flex flex-col gap-1">
                <label htmlFor="password">Password</label>
                <input type="password" id="password" name="email" 
                className="border border-black px-2 py-1"
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
        <p>
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