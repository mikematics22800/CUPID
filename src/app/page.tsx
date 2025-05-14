import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Heart } from "lucide-react"; // Sparkles removed as it's part of the old logo
import { Logo } from "@/components/logo"; // Import new logo

export default function HomePage() {
  return (
    <div className="container mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-4 text-center">
      {/* Replace Sparkles with Logo component if you want the logo itself here */}
      {/* For now, keeping text-based intro, Logo is in SiteHeader */}
      <div className="mb-6">
         <Logo /> {/* Display the logo */}
      </div>
      <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl md:text-7xl mb-6">
        Welcome to <span className="text-primary">Ourglass</span>
      </h1>
      <p className="max-w-2xl text-xl text-muted-foreground mb-10">
        Discover meaningful connections. Ourglass helps you find like-minded individuals who share your passions and interests.
        Ready to find your spark?
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl w-full">
        <Card className="text-left shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center"><Users className="mr-2 h-6 w-6 text-accent"/> Create Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Sign up and build a profile that truly represents you. Share your photos, bio, and interests to start connecting.</p>
          </CardContent>
          <CardFooter>
             <Button asChild className="w-full bg-primary hover:bg-primary/90">
                <Link href="/register">Get Started</Link>
            </Button>
          </CardFooter>
        </Card>
        <Card className="text-left shadow-xl hover:shadow-2xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center"><Heart className="mr-2 h-6 w-6 text-accent"/> Find Matches</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Swipe through profiles, discover new people, and find those who catch your eye. Thoughtful swiping encouraged!</p>
          </CardContent>
           <CardFooter>
             <Button asChild className="w-full" variant="outline">
                <Link href="/login">Login to Explore</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground mt-8">
        Already have an account? <Link href="/login" className="font-medium text-primary hover:underline">Login here</Link>.
      </p>
    </div>
  );
}
