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

const MAX_HOBBIES = 5;

export default function ProfileHobbiesPage() {
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const handleHobbyChange = (hobby: string) => {
    setSelectedHobbies(prev => {
      if (prev.includes(hobby)) {
        return prev.filter(h => h !== hobby);
      } else {
        if (prev.length < MAX_HOBBIES) {
          return [...prev, hobby];
        }
        toast({
          title: `Limit Reached`,
          description: `You can select up to ${MAX_HOBBIES} hobbies.`,
          variant: "default",
        });
        return prev;
      }
    });
  };

  const handleSubmit = () => {
    if (selectedHobbies.length !== MAX_HOBBIES) {
      toast({
        title: "Select Hobbies",
        description: `Please select exactly ${MAX_HOBBIES} hobbies to continue.`,
        variant: "destructive",
      });
      return;
    }
    console.log("Selected hobbies:", selectedHobbies);
    toast({
      title: "Hobbies Saved (Mock)",
      description: "Proceeding to phone verification...",
    });
    router.push("/verify-phone");
  };

  return (
    <Card className="shadow-xl">
      <CardHeader>
        <CardTitle className="flex items-center text-2xl font-semibold">
          <ListChecks className="mr-2 h-7 w-7 text-primary" />
          Share Your Interests
        </CardTitle>
        <CardDescription>Select up to {MAX_HOBBIES} hobbies that you enjoy. This helps in finding better matches!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 mb-6 max-h-96 overflow-y-auto p-1">
          {HOBBIES_LIST.map((hobby) => (
            <div key={hobby} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-muted/50 transition-colors">
              <Checkbox
                id={`hobby-${hobby}`}
                checked={selectedHobbies.includes(hobby)}
                onCheckedChange={() => handleHobbyChange(hobby)}
                disabled={selectedHobbies.length >= MAX_HOBBIES && !selectedHobbies.includes(hobby)}
              />
              <Label htmlFor={`hobby-${hobby}`} className="text-base font-normal cursor-pointer flex-1">
                {hobby}
              </Label>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {selectedHobbies.length} of {MAX_HOBBIES} hobbies selected.
        </p>
        <Button onClick={handleSubmit} className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3 group">
          Next: Verify Phone
          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Button>
      </CardContent>
    </Card>
  );
}
