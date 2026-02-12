import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";

const Layout = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="container flex-1 pt-5 sm:pt-7">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
