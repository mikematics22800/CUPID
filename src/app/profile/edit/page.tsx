
"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCircle2, Camera, ListChecks, UploadCloud, Image as ImageIcon, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HOBBIES_LIST } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";
import { getCurrentUser } from "@/lib/mock-data";

const MIN_BIO_LENGTH = 100;
const MAX_BIO_LENGTH = 1000;
const MAX_PHOTOS = 6;
const MIN_HOBBIES = 3;

export default function ProfileEditPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // States for each form section
  const [bio, setBio] = useState("");
  const [photos, setPhotos] = useState<(string | null)[]>(Array(MAX_PHOTOS).fill(null));
  const [uploading, setUploading] = useState<boolean[]>(Array(MAX_PHOTOS).fill(false));
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setBio(user.bio || "");
      
      const userPhotos = user.photos || [];
      const initialPhotos = Array(MAX_PHOTOS).fill(null).map((_, i) => userPhotos[i] || null);
      setPhotos(initialPhotos);
      
      setSelectedHobbies(user.hobbies || []);
    } else {
      // Handle user not found, perhaps redirect to login
      toast({ title: "Error", description: "User data not found. Please log in.", variant: "destructive" });
      router.push("/login");
    }
  }, [router, toast]);

  const handleSaveBio = (event: FormEvent) => {
    event.preventDefault();
    if (bio.length < MIN_BIO_LENGTH) {
      toast({ title: "Bio Too Short", description: `Bio must be at least ${MIN_BIO_LENGTH} characters.`, variant: "destructive" });
      return;
    }
    if (bio.length > MAX_BIO_LENGTH) {
      toast({ title: "Bio Too Long", description: `Bio must be at most ${MAX_BIO_LENGTH} characters.`, variant: "destructive" });
      return;
    }
    // Mock save
    console.log("Saving bio:", bio);
    toast({ title: "Bio Updated", description: "Your bio has been saved." });
  };

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(prev => { const newUp = [...prev]; newUp[index] = true; return newUp; });
      setTimeout(() => { // Simulate upload
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => { const newPh = [...prev]; newPh[index] = reader.result as string; return newPh; });
          setUploading(prev => { const newUp = [...prev]; newUp[index] = false; return newUp; });
        };
        reader.readAsDataURL(file);
      }, 1000);
    }
  };

  const triggerFileInput = (index: number) => {
    fileInputRefs.current[index]?.click();
  };
  
  const handleSavePhotos = () => {
    const uploadedCount = photos.filter(p => p !== null).length;
    if (uploadedCount < MAX_PHOTOS) {
      toast({ title: "Not Enough Photos", description: `Please upload all ${MAX_PHOTOS} photos.`, variant: "destructive" });
      return;
    }
    // Mock save
    console.log("Saving photos:", photos.filter(p => p !== null));
    toast({ title: "Photos Updated", description: "Your photos have been saved." });
  };

  const handleHobbyChange = (hobby: string) => {
    setSelectedHobbies(prev =>
      prev.includes(hobby) ? prev.filter(h => h !== hobby) : [...prev, hobby]
    );
  };

  const handleSaveHobbies = () => {
    if (selectedHobbies.length < MIN_HOBBIES) {
      toast({ title: "Not Enough Hobbies", description: `Please select at least ${MIN_HOBBIES} hobbies/interests.`, variant: "destructive" });
      return;
    }
    // Mock save
    console.log("Saving hobbies:", selectedHobbies);
    toast({ title: "Hobbies & Interests Updated", description: "Your selections have been saved." });
  };

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold tracking-tight">Edit Your Profile</CardTitle>
          <CardDescription>Keep your profile up-to-date to make the best connections.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="bio" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="bio" className="flex items-center gap-2"><UserCircle2 className="h-5 w-5"/> Bio</TabsTrigger>
              <TabsTrigger value="photos" className="flex items-center gap-2"><Camera className="h-5 w-5"/> Photos</TabsTrigger>
              <TabsTrigger value="hobbies" className="flex items-center gap-2"><ListChecks className="h-5 w-5"/> Hobbies & Interests</TabsTrigger>
            </TabsList>

            <TabsContent value="bio">
              <form onSubmit={handleSaveBio} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="bio-edit">Your Bio</Label>
                  <Textarea
                    id="bio-edit"
                    placeholder={`Tell us about yourself (min ${MIN_BIO_LENGTH}, max ${MAX_BIO_LENGTH} characters)`}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    minLength={MIN_BIO_LENGTH}
                    maxLength={MAX_BIO_LENGTH}
                    className="min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {bio.length < MIN_BIO_LENGTH 
                      ? `${bio.length}/${MIN_BIO_LENGTH} (min ${MIN_BIO_LENGTH})` 
                      : `${bio.length}/${MAX_BIO_LENGTH}`
                    }
                  </p>
                </div>
                <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group">
                  <Save className="mr-2 h-4 w-4" /> Save Bio
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="photos">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">Upload {MAX_PHOTOS} photos. The first photo is your main profile picture.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {photos.map((photoSrc, index) => (
                    <div key={index} className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center relative overflow-hidden bg-muted/50">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoUpload(e, index)}
                        ref={el => fileInputRefs.current[index] = el}
                        className="hidden"
                      />
                      {photoSrc ? (
                        <Image src={photoSrc} alt={`Profile photo ${index + 1}`} layout="fill" objectFit="cover" data-ai-hint="person image" />
                      ) : (
                        <button
                          onClick={() => triggerFileInput(index)}
                          className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors p-2"
                          disabled={uploading[index]}
                          aria-label={`Upload photo ${index + 1}`}
                        >
                          {uploading[index] ? (
                            <><UploadCloud className="h-8 w-8 animate-pulse" /><span className="text-xs mt-1">Uploading...</span></>
                          ) : (
                            <><ImageIcon className="h-10 w-10" /><span className="text-xs mt-1">Photo {index + 1}</span></>
                          )}
                        </button>
                      )}
                      {photoSrc && (
                        <Button 
                            variant="destructive" size="icon" 
                            className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100"
                            onClick={() => { setPhotos(prev => { const newP = [...prev]; newP[index] = null; return newP; }); }}
                            aria-label={`Remove photo ${index + 1}`}
                        ><span className="text-xs">X</span></Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                    {photos.filter(p => p !== null).length} of {MAX_PHOTOS} photos uploaded.
                </p>
                <Button onClick={handleSavePhotos} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group">
                  <Save className="mr-2 h-4 w-4" /> Save Photos
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="hobbies">
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">Select at least {MIN_HOBBIES} hobbies and interests that you enjoy.</p>
                <div className="space-y-3 max-h-80 overflow-y-auto p-1 border rounded-md">
                  {HOBBIES_LIST.map((hobby) => (
                    <div key={hobby} className="flex items-center space-x-3 p-2.5 rounded-md hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`hobby-edit-${hobby}`}
                        checked={selectedHobbies.includes(hobby)}
                        onCheckedChange={() => handleHobbyChange(hobby)}
                      />
                      <Label htmlFor={`hobby-edit-${hobby}`} className="text-base font-normal cursor-pointer flex-1">
                        {hobby}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedHobbies.length} hobbies and interests selected (min {MIN_HOBBIES}).
                </p>
                <Button onClick={handleSaveHobbies} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground group">
                  <Save className="mr-2 h-4 w-4" /> Save Hobbies & Interests
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
