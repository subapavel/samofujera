import { cn } from "@samofujera/ui";

type MainContentProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean;
};

export function MainContent({ fixed, className, ...props }: MainContentProps) {
  return (
    <main
      className={cn(
        "px-4 py-6",
        fixed && "flex flex-1 flex-col overflow-hidden",
        !fixed && "max-w-7xl mx-auto w-full",
        className
      )}
      {...props}
    />
  );
}
