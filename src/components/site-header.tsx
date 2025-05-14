
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { User, MessageSquare } from 'lucide-react';
import { Logo } from './logo'; // Assuming Logo component is in the same directory or accessible path

export function SiteHeader() {
  const unreadMessages = 3; // Mock unread messages count

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between">
        <Link href="/" aria-label="Go to homepage" className="flex items-center space-x-2">
          <Logo className="h-8 w-auto" />
        </Link>
        <nav className="flex items-center space-x-2 sm:space-x-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/chats" aria-label="View Chats" className="relative">
              <MessageSquare className="h-5 w-5" />
              {unreadMessages > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                  {unreadMessages}
                </span>
              )}
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/profile/edit" aria-label="User Profile / Edit">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
