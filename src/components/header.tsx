import { AttendSyncIcon } from "@/components/icons";

export function Header() {
  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 border-b bg-card">
      <div className="flex items-center gap-3">
        <AttendSyncIcon className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-headline font-bold text-foreground">
          AttendSync
        </h1>
      </div>
    </header>
  );
}
