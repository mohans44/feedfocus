const Footer = () => {
  return (
    <footer className="mt-8 border-t border-border/60 bg-background/80">
      <div className="container flex flex-col items-center justify-between gap-2 py-3 text-sm text-muted-foreground sm:flex-row sm:py-4">
        <p className="font-semibold tracking-wide text-foreground">feedfocus</p>
        <p className="text-center sm:text-right">
          Developed by{" "}
          <a
            href="https://mohanseetha.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Mohan
          </a>
        </p>
      </div>
    </footer>
  );
};

export default Footer;
