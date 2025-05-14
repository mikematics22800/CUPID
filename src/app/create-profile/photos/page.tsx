
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Camera, UploadCloud, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, useRef } from "react";
import { useToast } from "@/hooks/use-toast";

const MAX_PHOTOS = 6; 

export default function ProfilePhotosPage() {
  const [photos, setPhotos] = useState<(string | null)[]>(Array(MAX_PHOTOS).fill(null));
  const [uploading, setUploading] = useState<boolean[]>(Array(MAX_PHOTOS).fill(false));
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const handlePhotoUpload = (event: ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploading(prev => {
        const newUploading = [...prev];
        newUploading[index] = true;
        return newUploading;
      });
      // Simulate upload
      setTimeout(() => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotos(prev => {
            const newPhotos = [...prev];
            newPhotos[index] = reader.result as string;
            return newPhotos;
          });
           setUploading(prev => {
            const newUploading = [...prev];
            newUploading[index] = false;
            return newUploading;
          });
        };
        reader.readAsDataURL(file);
      }, 1000);
    }
  };

  const triggerFileInput = (index: number) => {
    fileInputRefs.current[index]?.click();
  };

  const handleSubmit = () => {
    const uploadedPhotosCount = photos.filter(p => p !== null).length;
    if (uploadedPhotosCount < MAX_PHOTOS) {
      toast({
        title: "Not Enough Photos",
        description: `Please upload all ${MAX_PHOTOS} photos to continue.`,
        variant: "destructive",
      });
      return;
    }
    console.log("Photos submitted:", photos.filter(p => p !== null));
    toast({
      title: "Photos Saved (Mock)",
      description: "Proceeding to select hobbies and interests...",
    });
    router.push("/create-profile/hobbies");
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-semibold">
          <Camera className="mr-2 h-7 w-7 text-primary" />
          Upload Your Best Photos
        </CardTitle>
        <CardDescription>Add {MAX_PHOTOS} photos that showcase your personality. Good photos get more attention!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
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
                <Image src={photoSrc} alt={`Profile photo ${index + 1}`} layout="fill" objectFit="cover" />
              ) : (
                <button
                  onClick={() => triggerFileInput(index)}
                  className="flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition-colors p-2"
                  disabled={uploading[index]}
                  aria-label={`Upload photo ${index + 1}`}
                >
                  {uploading[index] ? (
                    <>
                      <UploadCloud className="h-8 w-8 animate-pulse" />
                      <span className="text-xs mt-1">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-10 w-10" />
                      <span className="text-xs mt-1">Photo {index + 1}</span>
                    </>
                  )}
                </button>
              )}
               {photoSrc && (
                 <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-1 right-1 h-6 w-6 opacity-80 hover:opacity-100"
                    onClick={() => {
                        setPhotos(prev => {
                            const newPhotos = [...prev];
                            newPhotos[index] = null;
                            return newPhotos;
                        });
                    }}
                    aria-label={`Remove photo ${index + 1}`}
                 >
                    <span className="text-xs">X</span>
                 </Button>
               )}
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
            {photos.filter(p => p !== null).length} of {MAX_PHOTOS} photos uploaded. The first photo will be your main profile picture.
        </p>
        <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 group">
          Next: Select Hobbies and Interests
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}
