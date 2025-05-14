import type { SVGProps } from 'react';
import { Sparkles } from 'lucide-react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center" aria-label="Connectify Logo">
      <Sparkles className="h-8 w-8 text-primary" />
      <span className="ml-2 text-2xl font-bold text-primary">Connectify</span>
    </div>
  );
}
