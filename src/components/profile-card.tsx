
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, MapPin, BookOpen, Sparkles } from "lucide-react";

export interface Profile {
  id: string;
  name: string;
  age: number;
  photos: string[];
  bio: string;
  hobbies: string[]; // Internal name can remain hobbies for data structure consistency
  distance?: string; // Optional
}

interface ProfileCardProps {
  profile: Profile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <Card className="w-full max-w-sm overflow-hidden shadow-xl rounded-2xl transform transition-all duration-300 hover:scale-105">
      <CardHeader className="p-0 relative">
        {profile.photos && profile.photos.length > 0 ? (
          <Image
            src={profile.photos[0]}
            alt={`${profile.name}'s photo`}
            width={400}
            height={500}
            className="aspect-[3/4] object-cover w-full"
            data-ai-hint="person portrait"
          />
        ) : (
          <div className="aspect-[3/4] bg-muted flex items-center justify-center" data-ai-hint="placeholder pattern">
            <User className="w-24 h-24 text-muted-foreground" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          <CardTitle className="text-3xl font-bold text-white">
            {profile.name}, <span className="font-light">{profile.age}</span>
          </CardTitle>
          {profile.distance && (
            <p className="text-sm text-slate-200 flex items-center">
              <MapPin className="w-4 h-4 mr-1" /> {profile.distance} away
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center"><BookOpen className="w-4 h-4 mr-2 text-primary" />Bio</h3>
          <p className="text-foreground leading-relaxed line-clamp-3">
            {profile.bio}
          </p>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center"><Sparkles className="w-4 h-4 mr-2 text-accent" />Hobbies and Interests</h3>
          <div className="flex flex-wrap gap-2">
            {profile.hobbies.slice(0, 5).map((hobby) => ( // Display up to 5 hobbies/interests
              <Badge key={hobby} variant="secondary" className="bg-accent/20 text-accent-foreground hover:bg-accent/30 transition-colors">
                {hobby}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
