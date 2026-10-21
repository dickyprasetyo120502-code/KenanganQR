
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CreateGallery from "./pages/CreateGallery";
import GalleryDetail from "./pages/GalleryDetail";
import PublicAlbum from "./pages/PublicAlbum";

function App() {
  const path = window.location.pathname;

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/register") {
    return <Register />;
  }

  if (path === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (path === "/dashboard/create") {
    return <CreateGallery />;
  }

  if (path === "/gallery-detail") {
    return <GalleryDetail />;
  }

  if (path === "/dashboard") {
    return <Dashboard />;
  }

  if (path === "/galeri" || path.startsWith("/galeri/")) {
    return <PublicAlbum />;
  }

  return <Home />;
}

export default App;
