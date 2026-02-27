import { useEffect } from 'react';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500); // Show splash for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center text-white z-50">
      <div className="animate-bounce mb-4">
        <CalendarIcon size={64} />
      </div>
      <h1 className="text-3xl font-bold mb-2 animate-fade-in-up">Student Event Org</h1>
      <p className="text-blue-100 mb-8 animate-fade-in-up delay-100">Plan • Budget • Execute</p>
      <Loader2 className="animate-spin text-blue-200" size={24} />
    </div>
  );
}
