const Footer = () => {
  return (
    <footer className="mt-8 border-t border-border/80 bg-background/82 backdrop-blur-md">
      <div className="container overflow-hidden py-3 text-center text-[11px] text-muted-foreground sm:py-4 sm:text-sm justify-between flex items-center gap-3">
        <p className="whitespace-nowrap shrink-0">
          <span className="font-semibold tracking-[0.12em] uppercase text-foreground">
            feedfocus
          </span>
        </p>
        <p className="whitespace-nowrap truncate">
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
