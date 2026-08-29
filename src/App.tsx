import { Route, Routes, useLocation } from "react-router-dom";
import Home from "@/pages/home/Home.tsx";
import "./App.css";
import { AnimatePresence } from "motion/react";
import { ThemeSwitch } from "@/components/ThemeSwitch";
import { Footer } from "@/components/Footer";

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="fixed top-4 right-4 z-50">
        <ThemeSwitch />
      </div>
      <main className="flex-1">
        <AppContent />
      </main>
      <Footer />
    </div>
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
