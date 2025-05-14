"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/hooks/use-toast";

export default function VerifyPhonePage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSendCode = (event: FormEvent) => {
    event.preventDefault();
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) { // Basic E.164 format validation
        toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid phone number with country code (e.g., +12223334444).",
            variant: "destructive",
        });
        return;
    }
    console.log("Sending verification code to:", phoneNumber);
    toast({
      title: "Code Sent (Mock)",
      description: `A verification code has been sent to ${phoneNumber}.`,
    });
    setCodeSent(true);
  };

  const handleVerifyCode = (event: FormEvent) => {
    event.preventDefault();
     if (verificationCode.length !== 6 || !/^\d+$/.test(verificationCode)) {
        toast({
            title: "Invalid Code",
            description: "Verification code must be 6 digits.",
            variant: "destructive",
        });
        return;
    }
    console.log("Verifying code:", verificationCode);
    toast({
      title: "Phone Verified (Mock)",
      description: "Your phone number has been successfully verified. Welcome to Ourglass!",
    });
    router.push("/dashboard");
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gradient-to-br from-background to-secondary/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <Phone className="mx-auto h-12 w-12 text-primary" />
          <CardTitle className="text-3xl font-bold tracking-tight text-primary">Verify Your Phone</CardTitle>
          <CardDescription>
            {codeSent 
              ? `Enter the 6-digit code sent to ${phoneNumber}.`
              : "We need to verify your phone number to complete your profile."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!codeSent ? (
            <form onSubmit={handleSendCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number (with country code)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+12345678900"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-3">
                Send Verification Code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                 <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="_ _ _ _ _ _"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  required
                  className="text-center text-2xl tracking-[0.5em]"
                />
              </div>
              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-lg py-3">
                Verify & Complete Profile
              </Button>
              <Button variant="link" onClick={() => setCodeSent(false)} className="w-full text-primary">
                Entered wrong number?
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
