
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { HOBBIES_LIST } from "@/lib/constants";
import { ArrowRight, ListChecks } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const MIN_HOBBIES = 3; // Updated from 6 to 3

export default function ProfileHobbiesPage() {
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const handleHobbyChange = (hobby: string) => {
    setSelectedHobbies(prev => {
      if (prev.includes(hobby)) {
        return prev.filter(h => h !== hobby);
      } else {
        return [...prev, hobby];
      }
    });
  };

  const handleSubmit = () => {
    if (selectedHobbies.length < MIN_HOBBIES) {
      toast({
        title: "Select More Hobbies and Interests",
        description: `Please select at least ${MIN_HOBBIES} hobbies and interests to continue.`,
        variant: "destructive",
      });
      return;
    }
    console.log("Selected hobbies and interests:", selectedHobbies);
    toast({
      title: "Hobbies and Interests Saved (Mock)",
      description: "Proceeding to phone verification...",
    });
    router.push("/verify-phone");
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-semibold">
          <ListChecks className="mr-2 h-7 w-7 text-primary" />
          Share Your Hobbies and Interests
        </CardTitle>
        <CardDescription>Select at least {MIN_HOBBIES} hobbies and interests that you enjoy. This helps in finding better matches!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto p-1">
          {HOBBIES_LIST.map((hobby) => (
            <div key={hobby} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 transition-colors">
              <Checkbox
                id={`hobby-${hobby}`}
                checked={selectedHobbies.includes(hobby)}
                onCheckedChange={() => handleHobbyChange(hobby)}
              />
              <Label htmlFor={`hobby-${hobby}`} className="text-base font-normal cursor-pointer flex-1">
                {hobby}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {selectedHobbies.length} hobbies and interests selected (min {MIN_HOBBIES}).
        </p>
        <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 group">
          Next: Verify Phone
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}

