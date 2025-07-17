import React from 'react';

interface InputFieldProps {
  id: string;
  type: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: React.ReactNode;
}

export function InputField({ id, type, label, value, onChange, icon }: InputFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          {icon}
        </div>
        <input
          id={id}
          name={id}
          type={type}
          required
          value={value}
          onChange={onChange}
          className="appearance-none rounded-xl relative block w-full pl-12 pr-3 py-3 bg-dark-lighter border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent focus:border-transparent transition-all duration-200"
          placeholder={label}
        />
      </div>
    </div>
  );
}