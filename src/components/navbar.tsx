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
import { Moon, Sun, Menu } from 'lucide-react';
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


export function Navbar() {
  const { user, loading } = useUserProfile();
  const auth = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/');
  };
  
  const navLinks = [
      { href: '/', label: 'Home' },
      { href: '/blog', label: 'Blog' },
      { href: '/contact', label: 'Contact' },
  ];

  return (
    <header className="py-4 px-4 sm:px-6 lg:px-8 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <AttendSyncIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-foreground">
            AttendSync
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
                <Link key={link.href} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                </Link>
            ))}
        </nav>

        <div className="flex items-center gap-2">
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
                      <Link href="/dashboard">Dashboard</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                    Sign Out
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            ) : (
                <Button asChild>
                    <Link href="/auth">Login / Sign Up</Link>
                </Button>
            )}
          </div>

          <div className="md:hidden">
            {isMounted ? (
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <Menu />
                      </Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                      <SheetHeader>
                        <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
                      </SheetHeader>
                      <div className="flex flex-col gap-6 pt-10">
                          {navLinks.map(link => (
                              <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-foreground hover:text-primary transition-colors">
                                  {link.label}
                              </Link>
                          ))}
                           <div className="border-t pt-6">
                            {user ? (
                                <div className="space-y-4">
                                     <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-medium text-foreground hover:text-primary transition-colors">Dashboard</Link>
                                     <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-medium text-foreground hover:text-primary transition-colors">Profile</Link>
                                     <Button onClick={handleSignOut} className="w-full">Sign Out</Button>
                                </div>
                            ) : (
                                <Button asChild className="w-full">
                                    <Link href="/auth" onClick={() => setMobileMenuOpen(false)}>Login / Sign Up</Link>
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
