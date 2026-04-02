'use client';
import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { LoadingScreen } from '@/components/loading-screen';
import { AnimatePresence, motion } from 'framer-motion';

function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Loading your experience...");
  const [loadingStartTime, setLoadingStartTime] = useState(0);

  const MIN_LOADING_TIME = 3000; // 3 seconds

  const handleRouteChangeStart = useCallback(() => {
    setLoadingStartTime(Date.now());

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      switch (connection?.effectiveType) {
        case 'slow-2g':
        case '2g':
          setLoadingMessage("Slow network detected… optimizing your experience.");
          break;
        case '3g':
          setLoadingMessage("Preparing your dashboard...");
          break;
        case '4g':
        default:
          setLoadingMessage("Loading your experience...");
          break;
      }
    }
    
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setLoadingMessage("You are offline. Please check your connection.");
    }

    setIsLoading(true);
  }, []);

  const handleRouteChangeComplete = useCallback(() => {
    const elapsedTime = Date.now() - loadingStartTime;
    const remainingTime = MIN_LOADING_TIME - elapsedTime;

    if (remainingTime > 0) {
      setTimeout(() => setIsLoading(false), remainingTime);
    } else {
      setIsLoading(false);
    }
  }, [loadingStartTime]);

  useEffect(() => {
    window.addEventListener('routeChangeStart', handleRouteChangeStart);
    return () => {
      window.removeEventListener('routeChangeStart', handleRouteChangeStart);
    };
  }, [handleRouteChangeStart]);
  
  useEffect(() => {
      // This effect runs whenever the pathname changes, indicating a route change has completed.
      if (isLoading) {
          handleRouteChangeComplete();
      }
  }, [pathname, isLoading, handleRouteChangeComplete]);

  return (
    <>
      <AnimatePresence mode="wait">
        {isLoading && <LoadingScreen text={loadingMessage} />}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>AttendSync</title>
        <meta name="description" content="A modern attendance tracking system." />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Kaisei+HarunoUmi:wght@400;700&family=Inter:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased" suppressHydrationWarning>
        <FirebaseClientProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
                <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
            </main>
            <Footer />
          </div>
        </FirebaseClientProvider>
        <Toaster />
      </body>
    </html>
  );
}
