import { BrowserRouter, Routes, Route } from "react-router-dom";
import PublicRoute from "./components/PublicRoute";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Home from "./pages/Home";
import "../src/index.css"
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import NormalTask from "./pages/NormalTask";
import HighStake from "./pages/HighStake";
import Recipient from "./pages/Recipient";
import AllTasks from "./pages/AllTasks";

const App = () => {

    return (
      <>
        <div className="min-h-screen bg-[#18181b] antialiased">
        <BrowserRouter>
            <Navbar/>
            <Routes>

                <Route path="/" element={<Home />} />

                <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />

                <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>}/>

                <Route path="/tasks/new/high-stake" element={<ProtectedRoute><HighStake /></ProtectedRoute>}/>

                <Route path="/tasks/new/normal-task" element={<ProtectedRoute><NormalTask /></ProtectedRoute>}/>

                <Route path="/recipients" element={<ProtectedRoute><Recipient /></ProtectedRoute>}/>

                <Route path="/alltasks" element={<ProtectedRoute><AllTasks /></ProtectedRoute>}/>


            </Routes>
        </BrowserRouter>
        </div>
      </>
    );
};

export default App;