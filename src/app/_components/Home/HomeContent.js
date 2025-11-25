'use client';

import { useState } from 'react';
import CircleAnimation from '@/app/_components/Home/CircleAnimation';
import ChatBox from '@/app/_components/Home/ChatBox';

export default function HomeContent() {
  const [animationComplete, setAnimationComplete] = useState(false);

  return (
    <div>
      {!animationComplete && (
        <CircleAnimation onComplete={() => setAnimationComplete(true)} />
      )}
      {animationComplete && (
        <ChatBox />
      )}
    </div>
  );
}

