
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowRight, UserCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";

const MIN_BIO_LENGTH = 100;
const MAX_BIO_LENGTH = 500;

export default function ProfileDetailsPage() {
  const [bio, setBio] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!bio) {
      toast({
        title: "Missing Information",
        description: "Please fill out your bio to continue.",
        variant: "destructive",
      });
      return;
    }

    if (bio.length < MIN_BIO_LENGTH) {
      toast({
        title: "Bio Too Short",
        description: `Your bio must be at least ${MIN_BIO_LENGTH} characters long.`,
        variant: "destructive",
      });
      return;
    }
    if (bio.length > MAX_BIO_LENGTH) {
        toast({
          title: "Bio Too Long",
          description: `Your bio must be no more than ${MAX_BIO_LENGTH} characters long.`,
          variant: "destructive",
        });
        return;
      }
    console.log("Profile details:", { bio });
    toast({
      title: "Details Saved (Mock)",
      description: "Proceeding to photo upload...",
    });
    router.push("/create-profile/photos");
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-semibold">
          <UserCircle2 className="mr-2 h-7 w-7 text-primary" />
          Tell Us About Yourself
        </CardTitle>
        <CardDescription>This information will help others get to know you.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              placeholder={`Write a short bio about yourself (min ${MIN_BIO_LENGTH}, max ${MAX_BIO_LENGTH} characters)`}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              required
              minLength={MIN_BIO_LENGTH}
              maxLength={MAX_BIO_LENGTH}
              className="min-h-[120px]"
            />
            <p className="text-xs text-muted-foreground text-right">
              {bio.length < MIN_BIO_LENGTH 
                ? `${bio.length}/${MIN_BIO_LENGTH} (min ${MIN_BIO_LENGTH})` 
                : `${bio.length}/${MAX_BIO_LENGTH}`
              }
            </p>
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 group">
            Next: Add Photos
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
