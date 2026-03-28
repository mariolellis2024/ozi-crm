import React from 'react';

interface InputFieldProps {
  id: string;
  type?: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon?: React.ReactNode;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  min?: string;
  max?: string;
  step?: string;
  readOnly?: boolean;
  className?: string;
}

export function InputField({
  id,
  type = 'text',
  label,
  value,
  onChange,
  icon,
  required = true,
  placeholder,
  maxLength,
  min,
  max,
  step,
  readOnly,
  className,
}: InputFieldProps) {
  // If icon is provided, use the Login-style layout (sr-only label + icon)
  if (icon) {
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
            required={required}
            value={value}
            onChange={onChange}
            className="appearance-none rounded-xl relative block w-full pl-12 pr-3 py-3 bg-dark-lighter border border-gray-700 placeholder-gray-400 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent focus:border-transparent transition-all duration-200"
            placeholder={placeholder || label}
            maxLength={maxLength}
            min={min}
            max={max}
            step={step}
            readOnly={readOnly}
          />
        </div>
      </div>
    );
  }

  // Admin modal style: visible label + clean input
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-400 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        value={value}
        onChange={onChange}
        className={className || "w-full bg-dark-lighter border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-accent"}
        placeholder={placeholder || label}
        maxLength={maxLength}
        min={min}
        max={max}
        step={step}
        readOnly={readOnly}
      />
    </div>
  );
}