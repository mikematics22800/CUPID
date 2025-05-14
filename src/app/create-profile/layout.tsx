"use client";

import { Progress } from "@/components/ui/progress";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

const steps = [
  { path: "/create-profile/details", label: "Your Details", progress: 25 },
  { path: "/create-profile/photos", label: "Upload Photos", progress: 50 },
  { path: "/create-profile/hobbies", label: "Select Hobbies", progress: 75 },
  { path: "/verify-phone", label: "Verify Phone", progress: 100 }, // Assuming verify-phone is the next step
];

export default function CreateProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(steps[0]);

  useEffect(() => {
    const activeStep = steps.find(step => pathname.startsWith(step.path));
    if (activeStep) {
      setCurrentStep(activeStep);
    }
  }, [pathname]);

  const getPreviousStepPath = () => {
    const currentIndex = steps.findIndex(step => step.path === currentStep.path);
    if (currentIndex > 0) {
      return steps[currentIndex - 1].path;
    }
    if (currentStep.path === "/create-profile/details") {
        return "/register"; // Or wherever they came from before starting profile creation
    }
    return null;
  }

  const previousStepPath = getPreviousStepPath();

  return (
    <div className="container mx-auto max-w-2xl py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
            {previousStepPath && (
                 <Link href={previousStepPath} className="flex items-center text-sm text-muted-foreground hover:text-primary">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                </Link>
            )}
           <span className="text-sm font-medium text-primary ml-auto">{currentStep.label}</span>
        </div>
        <Progress value={currentStep.progress} className="w-full h-2 bg-accent" />
        <p className="text-xs text-muted-foreground mt-1 text-right">
          Step {steps.findIndex(step => step.path === currentStep.path) + 1} of {steps.length}
        </p>
      </div>
      {children}
    </div>
  );
}
