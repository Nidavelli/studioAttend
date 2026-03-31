'use client';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CheckCircle, ShieldCheck, MapPin, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { AttendSyncIcon } from "@/components/icons";

export default function LandingPage() {
  const features = [
    {
      icon: <MapPin className="h-8 w-8 text-primary" />,
      title: "Geofenced & QR Sign-In",
      description: "Ensure academic integrity with dual-factor attendance verification: GPS-based geofencing and dynamic QR codes with PINs."
    },
    {
      icon: <BarChart2 className="h-8 w-8 text-primary" />,
      title: "Real-Time Dashboards",
      description: "Lecturers monitor attendance live, while students track their progress instantly. No more waiting for manual updates."
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: "Device Fraud Detection",
      description: "Our system flags suspicious activity, such as multiple sign-ins from a single device, for lecturer review."
    },
  ];

  const howItWorks = [
    { title: "Create Your Account", description: "Lecturers and students sign up in seconds and choose their role." },
    { title: "Manage & Join Units", description: "Lecturers create course units, and students join easily with a unique code." },
    { title: "Start a Session", description: "Lecturers start a session, setting a duration and a secure geofence around the classroom." },
    { title: "Sign In Seamlessly", description: "Students sign in via GPS or QR code, with their attendance recorded instantly and immutably." },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 md:py-40">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-gradient-to-b from-background to-background/80"></div>
            <motion.div
              animate={{
                x: ['-20%', '20%'],
                y: ['-20%', '20%'],
                scale: [1, 1.5, 1],
                rotate: [0, 90, 0],
              }}
              transition={{
                duration: 20,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
              }}
              className="absolute h-96 w-96 rounded-full bg-primary/10 blur-3xl"
              style={{ top: '10%', left: '10%' }}
            ></motion.div>
            <motion.div
              animate={{
                x: ['20%', '-20%'],
                y: ['20%', '-20%'],
                scale: [1, 1.5, 1],
                rotate: [0, -90, 0],
              }}
              transition={{
                duration: 25,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "mirror",
              }}
              className="absolute h-96 w-96 rounded-full bg-secondary/10 blur-3xl"
              style={{ bottom: '10%', right: '10%' }}
            ></motion.div>
          </div>
          <div className="container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold font-headline mb-4">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Smart Attendance,
                </span>
                <br />
                Simplified.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
                AttendSync replaces tedious manual attendance with a secure, real-time system, ensuring academic integrity and saving valuable class time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/auth">Get Started for Free</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/blog">Learn More</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20 md:py-28 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold font-headline">Why AttendSync?</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to eliminate proxy attendance and streamline classroom management.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="p-8 rounded-lg bg-background shadow-sm text-center h-full">
                    <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-bold font-headline mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20 md:py-28">
            <div className="container mx-auto px-4">
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold font-headline">Simple Steps to Get Started</h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">A seamless experience for both educators and students.</p>
                </div>
                <div className="relative">
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 hidden md:block"></div>
                    {howItWorks.map((step, index) => (
                        <motion.div 
                            key={index}
                            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                            className={`flex items-center w-full mb-8 md:mb-0 ${index % 2 === 0 ? 'md:justify-start' : 'md:justify-end'}`}
                        >
                            <div className="md:w-1/2 md:px-8">
                                <div className={`relative p-8 rounded-lg bg-background border ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
                                    <div className="absolute left-1/2 -translate-x-1/2 md:left-auto md:right-full md:translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                                        {index + 1}
                                    </div>
                                    {index % 2 !== 0 && 
                                        <div className="absolute right-1/2 translate-x-1/2 md:right-auto md:left-full md:-translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg">
                                            {index + 1}
                                        </div>
                                    }
                                    <h3 className="text-xl font-bold font-headline mb-2">{step.title}</h3>
                                    <p className="text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="bg-muted/50 py-20 md:py-28">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold font-headline mb-4">Ready to Modernize Your Classroom?</h2>
            <p className="text-muted-foreground max-w-xl mx-auto mb-8">Join hundreds of educators who trust AttendSync to ensure integrity and save time.</p>
            <Button asChild size="lg">
              <Link href="/auth">Sign Up Now</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
