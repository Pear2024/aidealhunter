'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Microscope, Zap, CheckCircle2, Award } from 'lucide-react';

const products = {
  eternel: {
    name: 'Éternel',
    tagline: 'Defend Your Cells against Aging & Oxidative Stress',
    description: 'A revolutionary blend of Liposomal Resveratrol, CoQ10, and Glutathione designed to neutralize free radicals and promote cellular longevity.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24467',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892', // Replace with user's specific affiliate link
    benefits: [
      'Protects cells from damage and premature aging',
      'Promotes cellular energy and overall vitality',
      'Neutralizes free radicals with powerful antioxidants',
      'Maximum absorption via Liposomal Technology'
    ],
    ingredients: ['Resveratrol', 'Glutathione', 'Coenzyme Q10 (CoQ10)', 'Superfruit Blend'],
    color: 'from-purple-900 to-fuchsia-900',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
    image: 'https://images.unsplash.com/photo-1615486171448-4d69106be022?q=80&w=1000&auto=format&fit=crop' // placeholder
  },
  vitalite: {
    name: 'Vitalité',
    tagline: 'The Ultimate Cellular Foundation',
    description: 'A daily foundational supplement packing 72 trace minerals, massive enzyme blends, probiotics, and Omega-3s to optimize your health baseline.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24471',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: [
      'Supports gut microbiome health',
      'Provides 72 vital trace minerals',
      'Enhances daily energy and focus',
      'High bioavailability for cellular uptake'
    ],
    ingredients: ['72 Trace Minerals', 'Omega-3 Complex', 'Enzyme Blend', 'Probiotics'],
    color: 'from-emerald-900 to-teal-900',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    image: 'https://images.unsplash.com/photo-1550831107-1553da8c8464?q=80&w=1000&auto=format&fit=crop'
  },
  imune: {
    name: 'Imúne',
    tagline: 'Advanced Immune Modulation',
    description: 'Fortify your bodys natural defenses with Liposomal Vitamin C, Quercetin, Elderberry, and a proprietary medicinal mushroom blend.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24469',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: [
      'Boosts innate and adaptive immunity',
      'Powerful respiratory system support',
      'Modulates autoimmune responses',
      'Absorbs directly into the immune cells'
    ],
    ingredients: ['Liposomal Vitamin C', 'Quercetin', 'Elderberry', 'Reishi/Shiitake Blend'],
    color: 'from-blue-900 to-cyan-900',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    image: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ca?q=80&w=1000&auto=format&fit=crop'
  },
  revive: {
    name: 'Revíve',
    tagline: 'Erase Inflammation & Joint Pain',
    description: 'A potent anti-inflammatory complex using bio-active Curcumin, Boswellia, and Black Cumin oil to restore mobility and shut down chronic inflammation.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24470',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: [
      'Relieves joint stiffness and muscle soreness',
      'Neutralizes systemic chronic inflammation',
      'Speeds up exercise recovery',
      'Clinically proven joint mobility support'
    ],
    ingredients: ['Curcumin (Turmeric)', 'Boswellia', 'Black Cumin Oil', 'Sea Buckthorn'],
    color: 'from-amber-700 to-orange-900',
    buttonColor: 'bg-orange-600 hover:bg-orange-700',
    image: 'https://images.unsplash.com/photo-1620019448896-bc98dd3901b5?q=80&w=1000&auto=format&fit=crop'
  },
  purifi: {
    name: 'Purífi',
    tagline: 'Deep Cellular Detoxification',
    description: 'Cleanse your organs and strip heavy metals with Humic Shale Extract and Liposomal Milk Thistle, restoring your bodys natural filtration system.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24468',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: [
      'Flushes toxins and heavy metals from cells',
      'Supports optimal liver and kidney function',
      'Improves nutrient absorption',
      'Eliminates cellular waste effectively'
    ],
    ingredients: ['Humic Shale Extract', 'Liposomal Milk Thistle', 'Burdock Root', 'Chlorophyllin'],
    color: 'from-slate-800 to-zinc-900',
    buttonColor: 'bg-slate-700 hover:bg-slate-800',
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?q=80&w=1000&auto=format&fit=crop'
  },
  collagene: {
    name: 'Collagène',
    tagline: 'Structural Integrity & Dermal Elasticity',
    description: 'Medical-grade Marine Collagen (Types I, II, III) infused with Hyaluronic Acid explicitly designed for anti-aging and connective tissue strength.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24466',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: [
      'Visibly reduces fine lines and wrinkles',
      'Strengthens hair follicles and nail beds',
      'Supports tendon and ligament elasticity',
      'Deeply hydrates skin at the cellular level'
    ],
    ingredients: ['Marine Collagen (I, II, III)', 'Hyaluronic Acid', 'Keratin', 'Vitamin C'],
    color: 'from-rose-800 to-pink-900',
    buttonColor: 'bg-rose-600 hover:bg-rose-700',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop'
  }
},

  'glp-three': {
    name: 'GLP THREE',
    tagline: 'Metabolic & Blood Sugar Support',
    description: 'A revolutionary natural GLP-1 mimetic using MBC-267 Peptides from Norwegian Salmon to naturally curb cravings and manage blood sugar.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24563',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: ['Curbs neurological food cravings', 'Natural GLP-1 mimetic without the side effects', 'Balances blood sugar levels', 'Promotes healthy weight management'],
    ingredients: ['MBC-267 Peptides (Norwegian Salmon)', 'Mushroom Blend', 'Saffron Extract'],
    color: 'from-red-900 to-rose-900',
    buttonColor: 'bg-red-600 hover:bg-red-700',
    image: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?q=80&w=1000&auto=format&fit=crop'
  },
  'visage-creme': {
    name: 'Visage Crème Caviar',
    tagline: 'Premium Dermal Cellular Repair',
    description: 'An advanced neurocosmetic dermal moisturizer utilizing Mountain Caviar to provide deep cellular repair and elasticity.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24555',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: ['Deep cellular repair and hydration', 'Improves skin elasticity', 'Reduces appearance of wrinkles', 'Protects skin barrier'],
    ingredients: ['Mountain Caviar (Kochia scoparia)', 'Panax Ginseng', 'Acetyl hexapeptide-8'],
    color: 'from-stone-800 to-stone-900',
    buttonColor: 'bg-stone-600 hover:bg-stone-700',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop'
  },
  'visage-serum': {
    name: 'Visage Super Serum',
    tagline: 'Neurocosmetic Hydration Lock',
    description: 'A high-potency super-serum that locks in hydration, visibly reducing wrinkles using advanced Bakuchiol and Squalane.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24511',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: ['Locks in intense hydration', 'Visibly reduces fine lines and wrinkles', 'Promotes collagen production', 'Protects against environmental stressors'],
    ingredients: ['Bakuchiol', 'Squalane', 'Vitex agnus-castus'],
    color: 'from-sky-800 to-cyan-900',
    buttonColor: 'bg-sky-600 hover:bg-sky-700',
    image: 'https://images.unsplash.com/photo-1615486171448-4d69106be022?q=80&w=1000&auto=format&fit=crop'
  }

};

export default function ProductSalesPage() {
  const params = useParams();
  const slug = params?.slug?.toLowerCase();
  const product = products[slug];

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-800">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4">Product Not Found</h1>
          <Link href="/" className="text-emerald-600 underline">Return Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-200">
      {/* Hero Section */}
      <section className={`relative pt-32 pb-24 text-white overflow-hidden bg-gradient-to-br ${product.color}`}>
        <div className="absolute inset-0 bg-black/40 z-0"></div>
        <div className="max-w-6xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur border border-white/30 text-sm font-semibold mb-6">
              <ShieldCheck size={16} /> Clinical Grade Formula
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">{product.name}</h1>
            <p className="text-2xl font-light text-white/90 mb-6">{product.tagline}</p>
            <p className="text-lg text-white/80 mb-10 leading-relaxed">
              {product.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={product.buyLink} target="_blank" rel="noopener noreferrer" className={`px-8 py-4 rounded-full font-bold text-lg text-white text-center flex items-center justify-center gap-2 transition-transform hover:scale-105 shadow-xl ${product.buttonColor}`}>
                Order {product.name} Now <ArrowRight size={20} />
              </a>
              <a href="#science" className="px-8 py-4 rounded-full font-bold text-lg bg-white/10 hover:bg-white/20 text-white text-center backdrop-blur transition-colors border border-white/20">
                View Clinical Data
              </a>
            </div>
          </div>
          <div className="hidden lg:block relative">
             <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent blur-3xl rounded-full"></div>
             <img src={product.image} alt={product.name} className="w-full h-[500px] object-cover rounded-3xl shadow-2xl relative z-10 border-4 border-white/10" />
          </div>
        </div>
      </section>

      {/* PDR Trust Banner */}
      <section className="py-8 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-50 text-blue-800 rounded-2xl flex items-center justify-center font-black text-2xl border-2 border-blue-100 shadow-sm">
              PDR
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Listed in the Physicians' Desk Reference</h3>
              <p className="text-sm text-slate-500">Recognized globally by medical professionals.</p>
            </div>
          </div>
          <a href={product.pdrLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-semibold hover:underline flex items-center gap-1 text-sm">
            Verify {product.name} on PDR.net <ExternalLinkIcon size={14} />
          </a>
        </div>
      </section>

      {/* The Dr. Dan Gubler Section */}
      <section id="science" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            
            {/* Benefits */}
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 mb-8">Why {product.name} is Different</h2>
              <div className="space-y-6 mb-10">
                {product.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className={`mt-1 bg-white p-1 rounded-full shadow-sm text-emerald-500`}>
                      <CheckCircle2 size={24} />
                    </div>
                    <p className="text-lg text-slate-700 font-medium leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
              
              <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-sm uppercase tracking-wider font-bold text-slate-400 mb-4">Active Clinical Ingredients</h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing, idx) => (
                     <span key={idx} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-full text-sm font-semibold text-slate-700">{ing}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Dr. Dan Gubler Bio */}
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-3xl translate-x-4 translate-y-4 z-0"></div>
              <div className="bg-white p-8 rounded-3xl border border-blue-100 shadow-xl relative z-10">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-full flex items-center justify-center text-white shadow-md">
                     <Microscope size={28} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Dr. Dan Gubler, Ph.D.</h3>
                    <p className="text-blue-600 font-semibold text-sm">Chief Scientific Officer</p>
                  </div>
                </div>
                <h4 className="font-black text-slate-800 text-lg mb-4">Formulated by World-Class Caltech Science</h4>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  <strong>{product.name}</strong> was engineered from the ground up by Dr. Dan Gubler, a globally recognized <span className="text-slate-900 font-semibold">Phytonutrient Chemist</span> and former Caltech Postdoctoral Fellow (NASA's leading scientific partner institution).
                </p>
                <ul className="space-y-3 text-sm text-slate-600 mb-6">
                  <li className="flex gap-2"><Award size={16} className="text-amber-500 shrink-0 mt-0.5" /> <strong>Ph.D. in Organic Chemistry</strong>, expert in extracting healing molecules from nature.</li>
                  <li className="flex gap-2"><Zap size={16} className="text-amber-500 shrink-0 mt-0.5" /> <strong>Cellular Absorption Master:</strong> His breakthrough Liposomal technology ensures these ingredients aren't destroyed in your stomach, but bypass digestion to enter your cells with 100% bioavailability.</li>
                </ul>
                <div className="p-4 bg-slate-50 rounded-xl italic text-slate-700 text-sm border-l-4 border-blue-500 font-medium">
                  "We didn't just build a supplement. We created a targeted cellular delivery system using the most powerful compounds in nature."
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={`py-24 bg-gradient-to-br ${product.color} text-center`}>
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-4xl font-extrabold text-white mb-6">Ready to Transform Your Health?</h2>
          <p className="text-xl text-white/80 mb-10">
            Join thousands of patients currently using {product.name} to optimize their bodies at the cellular level. Backed by science, guaranteed by the PDR.
          </p>
          <a href={product.buyLink} target="_blank" rel="noopener noreferrer" className={`inline-flex px-10 py-5 rounded-full font-bold text-xl text-center items-center justify-center gap-3 transition-transform hover:scale-105 shadow-2xl bg-white text-slate-900 hover:bg-slate-50`}>
            Order {product.name} Now <ArrowRight size={24} />
          </a>
          <p className="mt-6 text-white/50 text-sm">You will be securely redirected to the official Three International portal.</p>
        </div>
      </section>
    </div>
  );
}

function ExternalLinkIcon({ size=24, className="" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}
