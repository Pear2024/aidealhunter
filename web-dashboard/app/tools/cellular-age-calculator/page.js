import React from 'react';
import CellularAgeClient from './CellularAgeClient';

export const metadata = {
  title: 'Free Cellular Age Calculator | Nadania Health',
  description: 'Calculate your true cellular age online. If you suffer from daytime fatigue, brain fog, or aging skin, your cells might be older than your chronological age. Test now.',
  keywords: 'cellular age calculator, biological age test, why am i so tired in the afternoon, liposomal vs regular vitamins, chronic fatigue symptom checker',
};

export default function CellularAgePage() {
  return (
    <>
      <div className="bg-blue-600 text-white text-center py-10 px-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">Free Cellular Age Calculator</h1>
        <p className="text-xl md:text-2xl text-blue-100 max-w-2xl mx-auto">
          Are you aging faster from the inside out? 
          Find out why your daytime energy crashes and what your true biological age is.
        </p>
      </div>
      <CellularAgeClient />
    </>
  );
}
