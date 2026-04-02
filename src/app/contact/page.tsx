'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Mail, Send, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUserProfile } from '@/hooks/use-user-profile';

const DashboardLink = () => {
  const { user } = useUserProfile();

  if (!user) {
    return null;
  }

  const handleLinkClick = () => {
    window.dispatchEvent(new CustomEvent('routeChangeStart'));
  };

  return (
    <div className="bg-muted border-b">
        <div className="container mx-auto px-4">
            <Button asChild variant="link" className="pl-0 text-muted-foreground">
                <Link href="/dashboard" onClick={handleLinkClick}>
                    <ArrowLeft className="mr-2" />
                    Back to Dashboard
                </Link>
            </Button>
        </div>
    </div>
  );
};


export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, you would handle form submission here (e.g., send to an API)
    setSubmitted(true);
    toast({
      title: 'Message Sent!',
      description: "Thanks for reaching out. We'll get back to you shortly.",
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
        <DashboardLink />
        <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
            <Mail className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-4xl md:text-5xl font-bold font-headline mb-4">Contact Us</h1>
            <p className="text-lg text-muted-foreground">
            Have questions or need support? Fill out the form below, and our team will get back to you as soon as possible.
            </p>
        </div>

        <Card className="max-w-xl mx-auto mt-12">
            <CardHeader>
            <CardTitle>Send a Message</CardTitle>
            <CardDescription>This is a demonstration form. Submissions are not monitored.</CardDescription>
            </CardHeader>
            <CardContent>
            {submitted ? (
                <div className="text-center p-8">
                <h3 className="text-2xl font-bold mb-2">Thank You!</h3>
                <p className="text-muted-foreground">Your message has been "sent".</p>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                    <label htmlFor="name" className="text-sm font-medium">Name</label>
                    <Input id="name" placeholder="Your Name" required />
                    </div>
                    <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">Email</label>
                    <Input id="email" type="email" placeholder="you@example.com" required />
                    </div>
                </div>
                <div className="space-y-2">
                    <label htmlFor="message" className="text-sm font-medium">Message</label>
                    <Textarea id="message" placeholder="How can we help you?" rows={5} required />
                </div>
                <Button type="submit" className="w-full">
                    <Send className="mr-2 h-4 w-4" />
                    Send Message
                </Button>
                </form>
            )}
            </CardContent>
        </Card>
        </div>
    </div>
  );
}
