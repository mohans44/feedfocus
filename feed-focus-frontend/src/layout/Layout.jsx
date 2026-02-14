import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Layout = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 pt-3 sm:pt-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
