'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/use-user-profile';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';
import { AttendSyncIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Moon, Sun, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getAvatarUrl } from '@/lib/avatars';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTheme = storedTheme || systemTheme;
    setTheme(initialTheme);
    if (initialTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

const AnimatedHamburgerIcon = ({ open }: { open: boolean }) => {
  return (
    <div className="relative h-5 w-5">
      <motion.div
        className="absolute h-0.5 w-full bg-foreground"
        style={{ top: '20%' }}
        animate={open ? { rotate: 45, y: 5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-0.5 w-full bg-foreground"
        style={{ top: '50%' }}
        animate={open ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute h-0.5 w-full bg-foreground"
        style={{ bottom: '20%' }}
        animate={open ? { rotate: -45, y: -5 } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      />
    </div>
  )
}

export function Navbar() {
  const { user, loading } = useUserProfile();
  const auth = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    setIsMounted(true);
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleSignOut = async () => {
    window.dispatchEvent(new CustomEvent('routeChangeStart'));
    await signOut(auth);
    // The loading state will handle the redirect feel
  };
  
  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    const result = await installPrompt.prompt();
    console.log(`Install prompt was: ${result.outcome}`);
    setInstallPrompt(null);
  };

  const handleLinkClick = () => {
    window.dispatchEvent(new CustomEvent('routeChangeStart'));
    setMobileMenuOpen(false);
  };
  
  const navLinks = [
      { href: '/', label: 'Home' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
  ];

  const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <Link href={href} onClick={handleLinkClick} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
        {children}
    </Link>
  );

  const MobileNavLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
    <Link href={href} onClick={handleLinkClick} className="text-lg font-medium text-foreground hover:text-primary transition-colors">
        {children}
    </Link>
  );

  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" onClick={handleLinkClick} className="flex items-center gap-3">
          <AttendSyncIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-foreground">
            AttendSync
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
                <NavLink key={link.href} href={link.href}>
                    {link.label}
                </NavLink>
            ))}
        </nav>

        <div className="flex items-center gap-2">
          {installPrompt && isMounted && (
            <Button size="sm" onClick={handleInstallClick}>
              <Download className="mr-2 h-4 w-4" />
              Install
            </Button>
          )}
          {isMounted ? <ThemeToggle /> : <Skeleton className="h-10 w-10" />}
          
          <div className="hidden md:flex items-center gap-2">
            {!isMounted || loading ? (
                <Skeleton className="h-10 w-24 rounded-md" />
            ) : user ? (
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                        <AvatarImage 
                        src={getAvatarUrl(user.avatarStyle, user.avatarSeed)} 
                        alt={user.name || 'User'}
                        />
                        <AvatarFallback>
                        {user.name
                            ? user.name.charAt(0)
                            : user.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                    <DropdownMenuLabel>
                    <div className="font-normal">
                        <p className="text-sm font-medium leading-none">
                        {user.name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                        </p>
                    </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                     <DropdownMenuItem asChild>
                      <Link href="/dashboard" onClick={handleLinkClick}>Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                    <Link href="/profile" onClick={handleLinkClick}>Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                    Sign Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button asChild>
                    <Link href="/auth" onClick={handleLinkClick}>Login / Sign Up</Link>
                </Button>
            )}
          </div>

          <div className="md:hidden">
            {isMounted ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <AnimatedHamburgerIcon open={mobileMenuOpen} />
                          <span className="sr-only">Open menu</span>
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                      <SheetHeader>
                        <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col gap-6 pt-10">
                          {navLinks.map(link => (
                              <MobileNavLink key={link.href} href={link.href}>
                                  {link.label}
                              </MobileNavLink>
                          ))}
                           <div className="border-t pt-6">
                            {user ? (
                                <div className="space-y-4">
                                     <MobileNavLink href="/dashboard">Dashboard</MobileNavLink>
                                     <MobileNavLink href="/profile">Profile</MobileNavLink>
                                     <Button onClick={handleSignOut} className="w-full">Sign Out</Button>
                                </div>
                            ) : (
                                <Button asChild className="w-full">
                                    <Link href="/auth" onClick={handleLinkClick}>Login / Sign Up</Link>
                                </Button>
                            )}
                           </div>
                      </div>
                  </SheetContent>
              </Sheet>
              ) : <Skeleton className="h-10 w-10" />
            }
          </div>
        </div>
      </div>
    </header>
  );
}
