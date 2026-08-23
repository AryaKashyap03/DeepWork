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
        <nav className="flex justify-between p-3 bg-blue-600 ">
          <h1 className="text-3xl font-bold my-auto"><a href="/">DeepWork</a></h1>
          <ul className="hidden sm:flex gap-5 my-auto">
            <li>
              <a href="/" className="cursor-pointer">
                Home
              </a>
            </li>

            {user ? (
                <button className="bg-red-500 text-white px-2 rounded cursor-pointer" onClick={() => {
                        setMenuOpen(false);
                        logout();
                    }}>Logout
                </button>) : 
                (<li className="flex gap-5 my-auto"><button><a href="/signup" className="cursor-pointer">SignUp</a></button>
                 <button><a href="/login" className="cursor-pointer">Login</a></button></li>)
                }
          </ul>
          <img
            src={more}
            alt="menu icon"
            className="sm:hidden h-4 w-auto my-auto"
            onClick={() => setMenuOpen(true)}
          />
        </nav>
      )}
      {menuOpen && (
        <div className="flex flex-col gap-2 bg-blue-600  h-screen p-5 fixed z-50 inset-0">
          <img
            src={close}
            alt="close icon"
            className="w-4 justify-items-start"
            onClick={() => setMenuOpen(false)}
          />
          <ul className="flex flex-col gap-2">
            <li>
              <a href="/" className="cursor-pointer">
                Home
              </a>
            </li>
    
            {user ? (
              <button
                className="bg-red-500 text-white px-2 rounded cursor-pointer"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}>
                Logout
              </button>) : 
              (<li className="flex flex-col items-start gap-2"><button><a href="/signup" className="cursor-pointer">SignUp</a></button>
                <button><a href="/login" className="cursor-pointer">Login</a></button></li>)}
          </ul>
        </div>
      )}
    </>
  );
};

export default Navbar;
