import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { User } from 'lucide-react';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" aria-label="Go to homepage">
          <Logo />
        </Link>
        <nav className="flex items-center space-x-4">
          {/* Placeholder for user navigation/authentication status */}
          {/* <UserNav /> */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/login" aria-label="User Profile / Login">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
