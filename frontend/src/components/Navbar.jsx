import { useState } from "react";
import close from "../assets/close.png";
import more from "../assets/more.png";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const{user, logout} = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {!menuOpen && (
        <nav className="flex justify-between p-3 border-b border-white/10 bg-[#09090b] text-white ">
          <h1 className="text-3xl font-bold my-auto"><a href="/">DeepWork</a></h1>
          <ul className="hidden sm:flex gap-5 my-auto">
            <li>
              <a href="/" className="cursor-pointer">
                Home
              </a>
            </li>
            {user && <li>
              <a href="/dashboard" className="cursor-pointer">
                Dashboard
              </a>
            </li>}
            <li>
              <a href="/about" className="cursor-pointer">
                About
              </a>
            </li>

            {user ? (
                <button className="bg-red-500 text-white px-2 rounded cursor-pointer" onClick={() => {
                        setMenuOpen(false);
                        logout();
                    }}>Logout
                </button>) : 
                (<li className="flex gap-5 my-auto">
                  <button><a href="/login" className="cursor-pointer">Login</a></button>
                  <button><a href="/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium transition hover:bg-violet-500">SignUp</a></button>
                </li>)
                }
          </ul>
          <img
            src={more}
            alt="menu icon"
            className="sm:hidden h-5 w-5 my-auto invert"
            onClick={() => setMenuOpen(true)}
          />
        </nav>
      )}
      {menuOpen && (
        <div className="flex flex-col gap-4 border-b border-white/10 bg-[#18181b] text-white  h-screen p-5 fixed z-50 inset-0">
          <img
            src={close}
            alt="close icon"
            className="justify-items-start h-4 w-4 invert"
            onClick={() => setMenuOpen(false)}
          />
          <ul className="flex flex-col gap-4 items-center">
            <li>
              <a href="/" className="cursor-pointer">
                Home
              </a>
            </li>

            {user && <li>
              <a href="/dashboard" className="cursor-pointer">
                Dashboard
              </a>
            </li>}

            <li>
              <a href="/about" className="cursor-pointer">
                About
              </a>
            </li>
    
            {user ? (
              <button
                className="w-fit bg-red-500 text-white rounded cursor-pointer px-4 py-2"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}>
                Logout
              </button>) : 
              (<li className="flex flex-col gap-4">
                <button><a href="/login" className="cursor-pointer">Login</a></button>
                <button><a href="/signup" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium transition hover:bg-violet-500">SignUp</a></button> 
              </li>)}
          </ul>
        </div>
      )}
    </>
  );
};

export default Navbar;
