import * as React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", icon, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center group">
        {icon && (
          <div className="absolute left-4 text-gray-400 group-focus-within:text-primary transition-colors duration-300">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 ${
            icon ? "pl-12" : ""
          } text-sm text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all duration-300 shadow-inner`}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
