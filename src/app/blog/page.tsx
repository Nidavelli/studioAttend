import Link from 'next/link';
import Image from 'next/image';
import { Header } from '@/components/header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, Mail, Send } from 'lucide-react';

const blogPosts = [
  {
    title: 'Getting Started with AttendSync: A Lecturer\'s Guide',
    description: 'Learn how to set up your first unit, start a session, and monitor attendance in real-time.',
    thumbnail: '/placeholder.svg',
    date: 'July 15, 2024',
    tags: ['Guide', 'Lecturer'],
    imageSeed: '101',
  },
  {
    title: 'How Geofencing and QR Codes Prevent Proxy Attendance',
    description: 'A deep dive into the technology that powers AttendSync and ensures academic integrity.',
    thumbnail: '/placeholder.svg',
    date: 'July 10, 2024',
    tags: ['Technology', 'Security'],
    imageSeed: '102',
  },
  {
    title: 'For Students: Signing In with Location vs. QR Code',
    description: 'Understand the two easy ways to sign in for your classes and what to do if you encounter an issue.',
    thumbnail: '/placeholder.svg',
    date: 'July 5, 2024',
    tags: ['Guide', 'Student'],
    imageSeed: '103',
  },
    {
    title: 'Understanding Your Attendance Analytics',
    description: 'Learn how to use the analytics dashboard to track student engagement and identify at-risk students early.',
    thumbnail: '/placeholder.svg',
    date: 'June 28, 2024',
    tags: ['Analytics', 'Lecturer'],
    imageSeed: '104',
  },
  {
    title: 'The Future of Classroom Management: AI-Powered Insights',
    description: 'Explore how AttendSync leverages AI to provide personalized summaries of student attendance patterns.',
    thumbnail: '/placeholder.svg',
    date: 'June 22, 2024',
    tags: ['AI', 'Technology'],
    imageSeed: '105',
  },
  {
    title: 'Troubleshooting Common Sign-In Issues',
    description: 'A quick guide to solving common problems like location errors or invalid PINs.',
    thumbnail: '/placeholder.svg',
    date: 'June 15, 2024',
    tags: ['Troubleshooting', 'Student'],
    imageSeed: '106',
  },
];

const faqItems = [
  {
    question: 'How does the QR code sign-in work?',
    answer: 'Your lecturer displays a unique QR code for the session. You simply scan it with your phone\'s camera inside the AttendSync app and enter the 4-digit PIN shown on the lecturer\'s screen. This combination verifies you are physically in the room.',
  },
  {
    question: 'What happens if I\'m outside the geofence?',
    answer: 'If you try to sign in with the location method while outside the radius set by your lecturer, the sign-in will fail. The app will show you a map indicating your position relative to the allowed zone. You will need to move inside the circle to sign in.',
  },
  {
    question: 'What if my phone\'s GPS is not working?',
    answer: 'The QR code + PIN method is the perfect fallback. If you have any issues with location services, you can always use the visual verification method to sign in, as long as you can see the lecturer\'s screen.',
  },
  {
    question: 'I\'m having trouble logging in. What should I do?',
    answer: 'First, ensure you are using the correct email and password. Use the "Forgot Password" link if needed. If you signed up with a Google account, make sure you are using the Google sign-in option. For persistent issues, please contact support.',
  },
];

export default function BlogPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-muted py-20 md:py-32">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4">AttendSync Blog & Help Center</h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              Your resource for mastering AttendSync. Find guides, technical deep-dives, and answers to all your questions about our modern attendance tracking system.
            </p>
            <div className="relative max-w-xl mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input placeholder="Search articles, guides, and FAQs..." className="pl-12 h-12" />
            </div>
          </div>
        </section>

        {/* Blog Posts Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline mb-8 text-center">Latest Articles</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post, index) => (
                <Card key={index} className="flex flex-col overflow-hidden">
                  <div className="relative h-48 w-full">
                     <Image
                      src={`https://picsum.photos/seed/${post.imageSeed}/600/400`}
                      alt={post.title}
                      fill
                      style={{ objectFit: 'cover' }}
                      data-ai-hint="abstract technology"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle>{post.title}</CardTitle>
                    <div className="flex gap-2 pt-2">
                        {post.tags.map(tag => (
                             <span key={tag} className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-full">{tag}</span>
                        ))}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <CardDescription>{post.description}</CardDescription>
                  </CardContent>
                  <div className="p-6 pt-0 text-xs text-muted-foreground">
                    Published on {post.date}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-muted py-16 md:py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold font-headline mb-8 text-center">Frequently Asked Questions</h2>
            <Accordion type="single" collapsible className="max-w-3xl mx-auto">
              {faqItems.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger className="text-lg text-left">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Contact Section */}
        <section className="py-16 md:py-24">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl font-bold font-headline mb-4">Still Have Questions?</h2>
                <p className="text-muted-foreground mb-8">If you can't find what you're looking for, our support team is here to help.</p>
                <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                    <Button variant="outline" size="lg" asChild>
                        <Link href="mailto:support@attendsync.com">
                            <Mail className="mr-2" /> Email Support
                        </Link>
                    </Button>
                    <div className="text-muted-foreground">or</div>
                     <Card className="p-6 text-left w-full max-w-md">
                        <h3 className="font-bold mb-2">Send us a message (Placeholder)</h3>
                        <p className="text-sm text-muted-foreground mb-4">This is a placeholder for a future contact form.</p>
                        <Button disabled>
                            <Send className="mr-2"/> Submit
                        </Button>
                     </Card>
                </div>
            </div>
        </section>
      </main>
    </div>
  );
}
