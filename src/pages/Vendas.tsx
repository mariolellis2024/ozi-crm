import React from 'react';
import { SalesFunnel } from '../components/SalesFunnel';

export function Vendas() {
  return (
    <div className="p-8 fade-in">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 fade-in-delay-1">
          <div className="slide-in-left">
            <h1 className="text-3xl font-bold text-white">Vendas</h1>
            <p className="text-gray-400 mt-2">Acompanhe o funil de vendas e gerencie leads</p>
          </div>
        </div>

        <div className="scale-in-delay-1">
          <SalesFunnel />
        </div>
      </div>
    </div>
  );
}