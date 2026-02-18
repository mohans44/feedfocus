import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-5xl">404</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        The briefing you asked for isn’t here. Let’s get you back to the feed.
      </p>
      <Button onClick={() => navigate("/")}>Return home</Button>
    </div>
  );
};

export default NotFound;
