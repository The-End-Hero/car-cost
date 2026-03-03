import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "@/pages/home/Home.tsx";
import "./App.css";
import Login from "@/pages/login/Login.tsx";
import { AnimatePresence } from "motion/react";

function App() {
  return (
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

// Separate component to use hooks inside HashRouter
function AppContent() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </AnimatePresence>
  );
}

export default App;
