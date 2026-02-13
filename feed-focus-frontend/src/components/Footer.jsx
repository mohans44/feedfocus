const Footer = () => {
  return (
    <footer className="mt-8 border-t border-border/60 bg-background/80">
      <div className="container overflow-hidden py-3 text-center text-xs text-muted-foreground sm:py-4 sm:text-sm justify-between flex flex-col sm:flex-row items-center gap-2">
        <p className="whitespace-nowrap">
          <span className="font-semibold tracking-wide text-foreground">
            feedfocus
          </span>
        </p>
        <p className="whitespace-nowrap">
          <span className="mx-1">Developed by </span>
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
