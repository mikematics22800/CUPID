"use client";

import { useState, useEffect, useCallback } from 'react';

export function useCooldown(initialSeconds: number) {
  const [cooldown, setCooldown] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && cooldown > 0) {
      interval = setInterval(() => {
        setCooldown(seconds => seconds - 1);
      }, 1000);
    } else if (cooldown === 0 && isActive) {
      setIsActive(false);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, cooldown]);

  const startCooldown = useCallback(() => {
    setCooldown(initialSeconds);
    setIsActive(true);
  }, [initialSeconds]);

  return { cooldown, startCooldown, isCoolingDown: isActive };
}
