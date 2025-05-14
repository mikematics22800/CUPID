
"use client";

import { useState, useEffect } from "react";
import { ProfileCard, type Profile } from "@/components/profile-card";
import { Button } from "@/components/ui/button"; // Button will be removed for swipe actions
import { Heart, X, Zap, RotateCcw } from "lucide-react";
import { useCooldown } from "@/hooks/use-cooldown";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { motion, AnimatePresence, useMotionValue, useTransform, type PanInfo } from "framer-motion";

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

const SWIPE_COOLDOWN_SECONDS = 2; // Reduced for easier testing of drag
const SWIPE_THRESHOLD_X = 80; // Min drag distance in pixels for a swipe
const SWIPE_VELOCITY_THRESHOLD = 0.3; // Min velocity for a flick swipe

export default function DashboardPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { cooldown, startCooldown, isCoolingDown } = useCooldown(SWIPE_COOLDOWN_SECONDS);
  
  // This state will hold the direction of the swipe for the card *exiting*.
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);

  // Motion value for card's x position during drag
  const x = useMotionValue(0);

  // Transform x offset to rotation for visual feedback during drag
  const rotate = useTransform(x, [-200, 0, 200], [-20, 0, 20], { clamp: false });
  // Optional: transform opacity during drag for more feedback
  // const cardOpacity = useTransform(x, [-150, 0, 150], [0.7, 1, 0.7]);


  useEffect(() => {
    setProfiles(MOCK_PROFILES);
    x.set(0); // Reset for the first card
    setExitDirection(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Load profiles once

  useEffect(() => {
    // When a new card comes into view (currentIndex changes), reset its drag properties
    if (currentIndex < profiles.length) { // Ensure profile exists
        x.set(0);
        setExitDirection(null);
    }
  }, [currentIndex, profiles.length, x]);

  const handleSwipeAction = (action: "like" | "dislike", profileName: string) => {
    if (isCoolingDown || currentIndex >= profiles.length) return;

    console.log(`Swiped ${action} on ${profileName}`);
    startCooldown();
    setCurrentIndex(prev => prev + 1);
  };

  const onDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const { offset, velocity } = info;

    if (currentIndex >= profiles.length) return; // No profile to swipe

    if (Math.abs(offset.x) > SWIPE_THRESHOLD_X || Math.abs(velocity.x) > SWIPE_VELOCITY_THRESHOLD) {
      const direction = offset.x < 0 ? 'left' : 'right';
      setExitDirection(direction); // Set direction for the exit animation
      handleSwipeAction(direction === 'left' ? 'dislike' : 'like', profiles[currentIndex].name);
    } else {
      // Not a swipe, animate card back to center
      x.set(0); // motion.div style={{x}} will animate this
    }
  };

  const cardVariants = {
    initial: { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, type: "spring", stiffness: 100, damping: 20 } },
    exit: (customExitDirection: 'left' | 'right' | null) => {
      if (!customExitDirection) return { opacity: 0, scale: 0.8, transition: {duration: 0.2 }}; // Fallback if direction is null
      return {
        x: customExitDirection === 'left' ? -350 : 350,
        opacity: 0,
        scale: 0.85,
        rotate: customExitDirection === 'left' ? -25 : 25,
        transition: { duration: 0.3, ease: "easeIn" }
      };
    },
  };

  const currentProfile = profiles[currentIndex];

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

      <div className="relative h-[600px] w-full max-w-sm flex items-center justify-center">
        <AnimatePresence initial={false} custom={exitDirection}>
            {currentProfile ? (
            <motion.div
                key={currentProfile.id}
                className="absolute cursor-grab active:cursor-grabbing"
                style={{ x, rotate }} // Apply dynamic style for drag feedback. Add opacity: cardOpacity if used.
                drag="x"
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }} // Visual drag handled by style.x, these keep it centered logically
                dragElastic={0.7} // Allows some elastic drag feel beyond constraints if they were wider
                onDragEnd={onDragEnd}
                variants={cardVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                custom={exitDirection} // Pass the determined exit direction to the variant
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
                <Button onClick={() => { 
                    setProfiles(MOCK_PROFILES); // Re-populate for demo
                    setCurrentIndex(0); 
                    x.set(0); 
                    setExitDirection(null);
                }} variant="outline">
                    <RotateCcw className="mr-2 h-4 w-4" /> Reload Profiles (Demo)
                </Button>
            </motion.div>
            )}
        </AnimatePresence>
      </div>

      {/* Swipe buttons are now removed */}
      {/* 
      <div className="flex space-x-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-full p-0 w-20 h-20 border-2 border-rose-500 text-rose-500 hover:bg-rose-500/10 disabled:border-muted disabled:text-muted-foreground"
          onClick={() => handleSwipeAction("dislike", currentProfile?.name)}
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
          onClick={() => handleSwipeAction("like", currentProfile?.name)}
          disabled={isCoolingDown || !currentProfile}
          aria-label="Like profile"
        >
          <Heart className="h-10 w-10" />
        </Button>
      </div> 
      */}
    </div>
  );

    