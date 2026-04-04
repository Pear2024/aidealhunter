'use client';
import React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Microscope, Zap, CheckCircle2, Award, FileText, ActivitySquare } from 'lucide-react';

const products = {
  eternel: {
    name: 'Éternel',
    tagline: 'Defend Your Cells against Aging & Oxidative Stress',
    description: 'A revolutionary clinical blend of Liposomal Resveratrol, CoQ10, and Glutathione designed to neutralize free radicals, protect against UV damage, and promote cellular longevity.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24467',
    buyLink: 'https://threeinternational.com/en/productdetail/1712892/2797/US', 
    benefits: [
      'Protects and supports cells from damage and premature aging',
      'Promotes deep cellular longevity and overall health',
      'Neutralizes free radicals with powerful antioxidants',
      'Provides protection against cellular UV damage'
    ],
    ingredients: ['Resveratrol', 'Glutathione', 'Coenzyme Q10 (CoQ10)', 'Superfruit Blend'],
    color: 'from-purple-900 to-fuchsia-900',
    buttonColor: 'bg-purple-600 hover:bg-purple-700',
    image: 'https://threeinternational.com/shopping/productdetailimages/210102/E%CC%81ternel_Additional4.webp'
  },
  vitalite: {
    name: 'Vitalité',
    tagline: 'The Ultimate Cellular Foundation',
    description: 'A complete clinical portfolio of vitamins, minerals, and phytonutrients. Built to optimize heart, brain, and eye health while supporting a robust gut microbiome.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24471',
    buyLink: 'https://threeinternational.com/en/productdetail/1712892/2802/US',
    benefits: [
      'Provides a complete portfolio of essential phytonutrients',
      'Supports a healthy gut microbiome for systemic health',
      'Promotes advanced heart, brain, and eye health',
      'Boosts cellular energy and daily focus'
    ],
    ingredients: ['72 Trace Minerals', 'Omega-3 Complex', 'Enzyme Blend', 'Probiotics'],
    color: 'from-emerald-900 to-teal-900',
    buttonColor: 'bg-emerald-600 hover:bg-emerald-700',
    image: 'https://threeinternational.com/shopping/productdetailimages/210128/Vitalite%CC%81_Additional4.webp'
  },
  imune: {
    name: 'Imúne',
    tagline: 'Advanced Innate & Adaptive Immune Modulation',
    description: 'Fortify your bodys natural defenses. This formula promotes the health of both innate and adaptive immune systems while enhancing the gut microbiome for better systemic immunity.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24469',
    buyLink: 'https://threeinternational.com/en/productdetail/1712892/2803/US',
    benefits: [
      'Promotes the health of innate AND adaptive immune systems',
      'Supports a rapid, healthy immune response',
      'Enhances the gut microbiome for foundational immunity',
      'Absorbs directly into immune cells via CAT'
    ],
    ingredients: ['Liposomal Vitamin C', 'Quercetin', 'Elderberry', 'Reishi/Shiitake Blend'],
    color: 'from-blue-900 to-cyan-900',
    buttonColor: 'bg-blue-600 hover:bg-blue-700',
    image: 'https://threeinternational.com/shopping/productdetailimages/210136/Imu%CC%81ne_Additional4.webp'
  },
  revive: {
    name: 'Revíve',
    tagline: 'Erase Inflammation & Joint Pain',
    description: 'A potent anti-inflammatory complex designed to maintain a healthy inflammatory status, support healthy joints, ease muscle stiffness, and counteract free radical damage from exercise.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24470',
    buyLink: 'https://threeinternational.com/en/productdetail/1712892/2799/US',
    benefits: [
      'Maintains a healthy systemic inflammatory status',
      'Supports healthy joints and eases muscle stiffness',
      'Promotes rapid exercise recovery',
      'Counteracts exercise-induced free radical damage'
    ],
    ingredients: ['Curcumin (Turmeric)', 'Boswellia', 'Black Cumin Oil', 'Sea Buckthorn'],
    color: 'from-amber-700 to-orange-900',
    buttonColor: 'bg-orange-600 hover:bg-orange-700',
    image: 'https://threeinternational.com/shopping/productdetailimages/210122/Revi%CC%81ve_Additional4.webp'
  },
  purifi: {
    name: 'Purífi',
    tagline: 'Deep 5-Organ Cellular Detoxification',
    description: 'Cleanse and detoxify the five eliminative organs (liver, lungs, colon, kidneys, skin) to dramatically increase nutrient absorption and actively eliminate heavy metal toxins.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24468',
    buyLink: 'https://threeinternational.com/en/productdetail/1712892/2801/US',
    benefits: [
      'Detoxifies the liver, lungs, colon, kidneys, and skin',
      'Eliminates heavy metal toxins blocking cellular pathways',
      'Substantially increases overall nutrient absorption',
      'Supports a healthy weight management profile'
    ],
    ingredients: ['Humic Shale Extract', 'Liposomal Milk Thistle', 'Burdock Root', 'Chlorophyllin'],
    color: 'from-slate-800 to-zinc-900',
    buttonColor: 'bg-slate-700 hover:bg-slate-800',
    image: 'https://threeinternational.com/shopping/productdetailimages/210143/Purifi%CC%81_Additional4.webp'
  },
  collagene: {
    name: 'Collagène',
    tagline: 'Stimulate Original Collagen Production',
    description: 'Unlike standard aesthetic supplements, Collagène doesn\'t just replace—it actively stimulates the bodys natural collagen production to promote vibrant, youthful skin, hair, and nails.',
    pdrLink: 'https://www.pdr.net/full-prescribing-information/hl/?druglabelid=24466',
    buyLink: 'https://threeinternational.com/en/ShopProducts/1712892',
    benefits: [
      'Stimulates the bodys natural, original collagen production',
      'Promotes vibrant, elastic, and youthful-looking skin',
      'Supports structurally healthy hair and nails',
      'Provides additional support for immune response and joints'
    ],
    ingredients: ['Marine Collagen (I, II, III)', 'Hyaluronic Acid', 'Keratin', 'Vitamin C'],
    color: 'from-rose-800 to-pink-900',
    buttonColor: 'bg-rose-600 hover:bg-rose-700',
    image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop'
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
          <Link href="/" className="text-emerald-600 underline">Return to Assessment</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-200">
      
      {/* Navigation */}
      <nav className="absolute w-full z-50 top-0 text-white/70 py-4 px-6 font-semibold flex justify-between">
         <Link href="/wellness" className="hover:text-white flex items-center gap-2 transition-colors">
            ← Back to Assessment Results
         </Link>
      </nav>

      {/* Hero Section */}
      <section className={`relative pt-32 pb-24 text-white overflow-hidden bg-gradient-to-br ${product.color}`}>
        <div className="absolute inset-0 bg-black/30 z-0"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/microbial-mat.png')] opacity-20 z-0 mix-blend-overlay"></div>
        
        <div className="max-w-6xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur border border-white/30 text-sm font-semibold mb-6 shadow-lg shadow-black/10">
              <ShieldCheck size={16} /> Clinical Grade Formula
            </div>
            <h1 className="text-6xl md:text-7xl font-black mb-4 tracking-tight leading-none drop-shadow-lg">{product.name}</h1>
            <p className="text-2xl font-bold text-white/90 mb-6 drop-shadow">{product.tagline}</p>
            <p className="text-lg text-white/80 mb-10 leading-relaxed max-w-lg">
              {product.description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 shadow-2xl rounded-full max-w-max">
              <a href={product.buyLink} target="_blank" rel="noopener noreferrer" className={`px-10 py-5 rounded-full font-black text-xl text-white text-center flex items-center justify-center gap-3 transition-transform hover:scale-105 shadow-xl ${product.buttonColor}`}>
                Order {product.name} Now <ArrowRight size={22} className="stroke-[3px]" />
              </a>
            </div>
          </div>
          <div className="hidden lg:flex relative items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent blur-3xl rounded-full w-[400px] h-[400px] m-auto z-0 animate-pulse"></div>
             <img src={product.image} alt={product.name} className="w-full max-w-lg object-contain relative z-10 rounded-3xl shadow-2xl" style={{ maxHeight: '500px' }} />
          </div>
        </div>
      </section>

      {/* THREE SCIENTIFIC PILLARS BANNER */}
      <section className="py-12 bg-white border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6">
           <div className="grid md:grid-cols-3 gap-8 text-slate-800">
               <div className="flex gap-4">
                 <div className="w-14 h-14 bg-blue-50 shrink-0 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner border border-blue-100">
                   <ActivitySquare size={28} />
                 </div>
                 <div>
                   <h3 className="font-extrabold text-lg mb-1">CAT Technology</h3>
                   <p className="text-sm text-slate-600 leading-relaxed"><strong>Cellular Absorption Technology.</strong> Nutrients are wrapped in liposomes, ensuring they bypass stomach destruction and achieve maximum bioavailability.</p>
                 </div>
               </div>
               <div className="flex gap-4">
                 <div className="w-14 h-14 bg-emerald-50 shrink-0 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner border border-emerald-100">
                   <FileText size={28} />
                 </div>
                 <div>
                   <h3 className="font-extrabold text-lg mb-1">Clinical Dossier</h3>
                   <p className="text-sm text-slate-600 leading-relaxed">Backed by heavily researched <strong>Peer-Reviewed Clinical Data</strong> validating every ingredient and absorption mechanism.</p>
                 </div>
               </div>
               <div className="flex gap-4">
                 <div className="w-14 h-14 bg-blue-50 shrink-0 text-slate-900 rounded-2xl flex items-center justify-center shadow-inner border border-slate-200">
                   <p className="font-black text-2xl tracking-tighter">PDR</p>
                 </div>
                 <div>
                   <h3 className="font-extrabold text-lg mb-1">PDR Certified</h3>
                   <p className="text-sm text-slate-600 leading-relaxed">Listed explicitly in the <strong>Physicians' Desk Reference</strong>, demonstrating world-class medical integrity and trust.</p>
                 </div>
               </div>
           </div>
        </div>
      </section>

      {/* The Dr. Dan Gubler & Clinical Details Section */}
      <section id="science" className="py-24 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            
            {/* Benefits */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs uppercase tracking-widest rounded-full mb-4">
                Clinical Outcomes
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 mb-8 leading-tight">Why {product.name} Surpasses Ordinary Supplements</h2>
              <div className="space-y-6 mb-10">
                {product.benefits.map((benefit, idx) => (
                  <div key={idx} className="flex items-start gap-4">
                    <div className={`mt-1 bg-white p-1 rounded-full shadow-sm text-emerald-500 border border-slate-100`}>
                      <CheckCircle2 size={24} />
                    </div>
                    <p className="text-xl text-slate-700 font-medium leading-relaxed">{benefit}</p>
                  </div>
                ))}
              </div>
              
              <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm">
                <h3 className="text-sm uppercase tracking-wider font-extrabold text-slate-400 mb-4">Pure Active Ingredients</h3>
                <div className="flex flex-wrap gap-2">
                  {product.ingredients.map((ing, idx) => (
                     <span key={idx} className="px-5 py-2.5 bg-slate-50 hover:bg-slate-100 cursor-default transition-colors border border-slate-100 shadow-sm rounded-full text-sm font-semibold text-slate-800">{ing}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Dr. Dan Gubler Bio */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-[2rem] translate-x-6 translate-y-6 z-0 border border-blue-200"></div>
              <div className="bg-white p-10 rounded-[2rem] border border-blue-100 shadow-2xl relative z-10 transition-transform hover:-translate-y-1 duration-500">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-full flex items-center justify-center text-white shadow-xl border-4 border-white">
                     <Microscope size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Dr. Dan Gubler, Ph.D.</h3>
                    <p className="text-blue-600 font-bold uppercase tracking-wider text-xs">Chief Scientific Officer at Three</p>
                  </div>
                </div>
                
                <h4 className="font-extrabold text-slate-800 text-xl mb-4 leading-snug text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">Formulated by World-Class Caltech Science</h4>
                
                <p className="text-slate-600 text-[15px] leading-relaxed mb-6">
                  <strong>{product.name}</strong> was engineered from the molecular level up by Dr. Dan Gubler, a globally recognized <span className="text-slate-900 font-semibold border-b border-slate-300">Phytonutrient Chemist</span> and former Caltech Postdoctoral Fellow.
                </p>
                <ul className="space-y-4 text-[15px] text-slate-700 mb-8 font-medium">
                  <li className="flex gap-3"><Award size={20} className="text-amber-500 shrink-0 mt-0.5" /> <span><strong>Ph.D. in Organic Chemistry</strong>, an expert in extracting cellular healing molecules directly from nature.</span></li>
                  <li className="flex gap-3"><Zap size={20} className="text-amber-500 shrink-0 mt-0.5" /> <span><strong>Cellular Absorption Master:</strong> His breakthrough Liposomal technology ensures these ingredients bypass digestive destruction to enter your cells with near 100% bioavailability.</span></li>
                </ul>
                <div className="p-6 bg-slate-50/80 rounded-2xl italic text-slate-800 border-l-4 border-blue-500 text-lg font-serif">
                  "We didn't just build a supplement. We created a targeted cellular delivery system using the most powerful compounds in nature."
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Verify PDR Callout */}
      <section className="py-16 bg-slate-900 text-center border-t border-slate-800">
         <div className="max-w-3xl mx-auto px-6">
           <div className="w-20 h-20 bg-white text-slate-900 rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl mx-auto mb-6 transform -rotate-3">
              PDR
           </div>
           <h3 className="text-3xl font-extrabold text-white mb-4">Validate Our Clinical Integrity</h3>
           <p className="text-slate-400 mb-8 max-w-xl mx-auto text-lg leading-relaxed">
             We operate with complete scientific transparency. {product.name} is trusted by physicians and is officially listed in the Prescribers' Digital Reference.
           </p>
           <a href={product.pdrLink} target="_blank" rel="noopener noreferrer" className="inline-flex px-8 py-3 rounded-xl font-bold text-blue-400 bg-blue-900/30 border border-blue-800/50 hover:bg-blue-900/50 transition-colors">
             Read Full {product.name} PDR Report →
           </a>
         </div>
      </section>

      {/* Final CTA */}
      <section className={`py-32 bg-gradient-to-br ${product.color} text-center relative overflow-hidden`}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight drop-shadow-md">Ready to Transform Your Health?</h2>
          <p className="text-xl md:text-2xl font-light text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of patients currently using {product.name} to optimize their bodies at the cellular level.
          </p>
          <a href={product.buyLink} target="_blank" rel="noopener noreferrer" className={`inline-flex px-12 py-6 rounded-full font-black text-2xl text-center items-center justify-center gap-4 transition-transform hover:scale-105 shadow-[0_20px_50px_rgba(0,0,0,0.4)] bg-white text-slate-900 hover:bg-slate-100 ring-4 ring-white/20`}>
            Buy {product.name} Now <ArrowRight size={28} className="stroke-[3px]" />
          </a>
          <p className="mt-8 text-white/60 font-medium">You will be securely redirected to the official Three International portal.</p>
        </div>
      </section>
    </div>
  );
}
