'use client';

import { ShoppingBag, Ticket } from 'lucide-react';

export default function AffiliatesArea() {
  return (
    <div className="bg-[#15803d] text-white rounded-xl p-5 shadow-sm overflow-hidden">
      <h3 className="text-lg font-bold mb-4 flex items-center">
        <span className="text-yellow-400 mr-2 text-xl">★</span> Loja do Torcedor
      </h3>
      
      <div className="space-y-3">
        <a href="#" className="group block bg-[#166534] hover:bg-green-700 rounded-lg p-3 transition-all">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded flex-shrink-0"></div>
            <div>
              <h4 className="font-semibold text-sm leading-tight text-white">Camisa Oficial Cruzeiro 2024</h4>
              <p className="text-yellow-400 font-bold text-sm mt-1">R$ 299,90</p>
            </div>
          </div>
        </a>
        
        <a href="#" className="group block bg-[#166534] hover:bg-green-700 rounded-lg p-3 transition-all">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded flex-shrink-0"></div>
            <div>
              <h4 className="font-semibold text-sm leading-tight text-white">Camisa Oficial Atlético-MG 2024</h4>
              <p className="text-yellow-400 font-bold text-sm mt-1">R$ 299,90</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
