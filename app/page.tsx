import { Suspense } from 'react';
import ROICalculator from '@/components/ROICalculator';

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F9FAFB]">
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Laden...</div>
        </div>
      }>
        <ROICalculator />
      </Suspense>
    </main>
  );
}
