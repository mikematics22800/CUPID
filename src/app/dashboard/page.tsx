"use client";

import { useState, useEffect } from "react";
import { ProfileCard, type Profile } from "@/components/profile-card";
import { Button } from "@/components/ui/button";
import { Heart, X, Zap, RotateCcw } from "lucide-react";
import { useCooldown } from "@/hooks/use-cooldown";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnimatePresence, motion } from "framer-motion"; // For animations

const MOCK_PROFILES: Profile[] = [
  {
    id: "1",
    name: "Sarah",
    age: 28,
    photos: ["https://placehold.co/400x500/E91E63/white?text=Sarah", "https://placehold.co/400x500/FFC107/white?text=Sarah+2"],
    bio: "Loves hiking, reading, and exploring new cafes. Looking for someone adventurous and kind.",
    hobbies: ["Hiking", "Reading", "Coffee", "Travel", "Photography"],
    distance: "2 miles",
  },
  {
    id: "2",
    name: "Alex",
    age: 32,
    photos: ["https://placehold.co/400x500/4CAF50/white?text=Alex"],
    bio: "Software engineer by day, musician by night. Enjoys board games, concerts, and good conversations.",
    hobbies: ["Music", "Board Games", "Coding", "Concerts", "Cooking"],
    distance: "5 miles",
  },
  {
    id: "3",
    name: "Maria",
    age: 25,
    photos: ["https://placehold.co/400x500/2196F3/white?text=Maria"],
    bio: "Art student with a passion for painting and vintage films. Seeking a creative soul.",
    hobbies: ["Art", "Movies", "Museums", "Yoga", "Writing"],
    distance: "1 mile",
  },
];

const SWIPE_COOLDOWN_SECONDS = 30;

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { cooldown, startCooldown, isCoolingDown } = useCooldown(SWIPE_COOLDOWN_SECONDS);

  useEffect(() => {
    // Simulate fetching profiles
    setProfiles(MOCK_PROFILES);
  }, []);

  const handleSwipe = (action: "like" | "dislike") => {
    if (isCoolingDown || currentIndex >= profiles.length) return;

    console.log(`Swiped ${action} on ${profiles[currentIndex].name}`);
    startCooldown();
    // setCurrentIndex(prev => prev + 1); // Animate out first
    
    // Trigger animation, then advance index
    // For now, simple advance:
    setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
    }, 300); // Match animation duration
  };

  const currentProfile = profiles[currentIndex];

  const cardVariants = {
    initial: { opacity: 0, y: 50, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, type: "spring" } },
    exit: (direction: 'left' | 'right') => ({ 
        x: direction === 'left' ? -300 : 300, 
        opacity: 0, 
        scale: 0.8,
        rotate: direction === 'left' ? -15: 15,
        transition: { duration: 0.3 } 
    }),
  };


  if (!profiles.length && currentIndex === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4 text-center">
        <Zap className="w-24 h-24 text-primary mb-6" />
        <h2 className="text-3xl font-semibold mb-2">Loading Profiles...</h2>
        <p className="text-muted-foreground">Finding potential matches for you.</p>
        <Progress value={50} className="w-64 mt-4 h-2 bg-primary/20" />
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] p-4 space-y-8 overflow-hidden">
      {isCoolingDown && (
        <Alert variant="default" className="w-full max-w-sm bg-accent/10 border-accent text-accent-foreground">
          <Zap className="h-5 w-5 text-accent" />
          <AlertTitle>Cooldown Active</AlertTitle>
          <AlertDescription>
            Next swipe available in {cooldown}s.
            <Progress value={( (SWIPE_COOLDOWN_SECONDS - cooldown) / SWIPE_COOLDOWN_SECONDS) * 100} className="w-full h-1.5 mt-2 bg-accent/50 [&>div]:bg-accent" />
          </AlertDescription>
        </Alert>
      )}

      <div className="relative h-[600px] w-full max-w-sm flex items-center justify-center"> {/* Container for card animation */}
        <AnimatePresence customKey={currentProfile?.id}>
            {currentProfile ? (
            <motion.div
                key={currentProfile.id}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit={() => cardVariants.exit(Math.random() > 0.5 ? 'left' : 'right')} // Random exit for demo
                className="absolute"
            >
                <ProfileCard profile={currentProfile} />
            </motion.div>
            ) : (
            <motion.div initial={{opacity:0}} animate={{opacity:1}} className="text-center p-8 bg-card shadow-xl rounded-2xl">
                <Zap className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-2xl font-semibold mb-2 text-foreground">No More Profiles</h2>
                <p className="text-muted-foreground mb-6">
                You&apos;ve seen everyone for now. Check back later for new connections!
                </p>
                <Button onClick={() => { setCurrentIndex(0); setProfiles(MOCK_PROFILES);}} variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" /> Reload Profiles (Demo)
                </Button>
            </motion.div>
            )}
        </AnimatePresence>
      </div>


      <div className="flex space-x-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full p-0 w-20 h-20 border-2 border-rose-500 text-rose-500 hover:bg-rose-500/10 disabled:border-muted disabled:text-muted-foreground"
          onClick={() => handleSwipe("dislike")}
          disabled={isCoolingDown || !currentProfile}
          aria-label="Dislike profile"
        >
          <X className="h-10 w-10" />
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="rounded-full p-0 w-20 h-20 border-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10  disabled:border-muted disabled:text-muted-foreground"
          style={{borderColor: "hsl(var(--accent))", color: "hsl(var(--accent))"}}
          onClick={() => handleSwipe("like")}
          disabled={isCoolingDown || !currentProfile}
          aria-label="Like profile"
        >
          <Heart className="h-10 w-10" />
        </Button>
      </div>
    </div>
  );
}
