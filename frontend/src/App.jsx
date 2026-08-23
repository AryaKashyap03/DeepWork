import { BrowserRouter, Routes, Route } from "react-router-dom";
import PublicRoute from "./components/PublicRoute";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import "../src/index.css"
import Navbar from "./components/Navbar";


const App = () => {

    return (
      <>
        <BrowserRouter>
            <Navbar/>
            <Routes>

                <Route path="/" element={<Home />} />

                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

                <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />

            </Routes>
        </BrowserRouter>
      </>
    );
};

export default App;