import Link from "next/link";
import { AttendSyncIcon } from "./icons";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-8 md:space-y-0">
          <div className="flex-1 flex justify-center md:justify-start">
            <Link href="/" className="flex items-center gap-3">
              <AttendSyncIcon className="h-8 w-8 text-primary" />
              <span className="text-xl font-headline font-bold text-foreground">
                AttendSync
              </span>
            </Link>
          </div>
          <div className="flex-1 flex justify-center space-x-6">
            <Link href="/blog" className="text-sm text-muted-foreground hover:text-primary">Blog</Link>
            <Link href="/contact" className="text-sm text-muted-foreground hover:text-primary">Contact</Link>
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-primary">Login</Link>
          </div>
          <div className="flex-1 flex justify-center md:justify-end">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} AttendSync. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
