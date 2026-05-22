import * as React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "tiktok" | "spotify" | "ghost" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", children, ...props }, ref) => {
    const baseStyle =
      "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-300 focus:outline-none disabled:opacity-50 disabled:pointer-events-none cursor-pointer active:scale-95";
    
    const variants = {
      primary:
        "bg-primary text-white hover:bg-purple-600 shadow-[0_0_15px_rgba(168,85,247,0.3)] hover:shadow-[0_0_25px_rgba(168,85,247,0.6)]",
      secondary:
        "bg-white/5 border border-white/10 hover:bg-white/10 text-gray-200",
      tiktok:
        "bg-[#ff0050] text-white hover:bg-[#e00045] shadow-[0_0_15px_rgba(255,0,80,0.3)] hover:shadow-[0_0_25px_rgba(255,0,80,0.6)]",
      spotify:
        "bg-[#1db954] text-white hover:bg-[#1aa34a] shadow-[0_0_15px_rgba(29,185,84,0.3)] hover:shadow-[0_0_25px_rgba(29,185,84,0.6)]",
      ghost: "hover:bg-white/5 text-gray-400 hover:text-white",
      danger: "bg-red-500 hover:bg-red-600 text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-5 py-2.5 text-sm",
      lg: "px-7 py-3.5 text-base",
      icon: "p-2.5 rounded-full aspect-square",
    };

    return (
      <button
        ref={ref}
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
