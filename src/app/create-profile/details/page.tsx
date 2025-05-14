
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { SEX_OPTIONS } from "@/lib/constants";
import { ArrowRight, UserCircle2, CalendarDays } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const MIN_BIO_LENGTH = 100;
const MAX_BIO_LENGTH = 500;

export default function ProfileDetailsPage() {
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [sex, setSex] = useState("");
  const [bio, setBio] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const calculateAge = (dob: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!birthDate || !sex || !bio) {
      toast({
        title: "Missing Information",
        description: "Please fill out all fields to continue.",
        variant: "destructive",
      });
      return;
    }

    const age = calculateAge(birthDate);
    if (age < 18) {
      toast({
        title: "Age Restriction",
        description: "You must be at least 18 years old to use Ourglass.",
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
    console.log("Profile details:", { birthDate, sex, bio, calculatedAge: age });
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
            <Label htmlFor="birthDate">Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full justify-start text-left font-normal pl-10",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  {birthDate ? format(birthDate, "PPP") : <span>Select your date of birth</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  captionLayout="dropdown"
                  fromYear={1900}
                  toYear={new Date().getFullYear() - 18} // Ensure user can be at least 18
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sex">Sex</Label>
            <Select value={sex} onValueChange={setSex} required>
              <SelectTrigger id="sex">
                <SelectValue placeholder="Select your sex" />
              </SelectTrigger>
              <SelectContent>
                {SEX_OPTIONS.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
