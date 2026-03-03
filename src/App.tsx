import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import Home from "@/pages/home/Home.tsx";
import "./App.css";
import { AnimatePresence } from "motion/react";
import { ThemeSwitch } from "@/components/ThemeSwitch";

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen">
        <div className="fixed top-4 right-4 z-50">
          <ThemeSwitch />
        </div>
        <AppContent />
      </div>
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
      </Routes>
    </AnimatePresence>
  );
}

export default App;
