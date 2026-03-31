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
      <a
        href="#main-content"
        className="sr-only left-4 top-3 z-50 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main-content"
        className="container flex-1 pt-3 sm:pt-6"
        tabIndex={-1}
      >
        <div
          key={`${location.pathname}${location.search}`}
          className="page-enter"
        >
          <Outlet />
        </div>
      </main>
      <div className="hidden sm:block">
        <Footer />
      </div>
    </div>
  );
};

export default Layout;
