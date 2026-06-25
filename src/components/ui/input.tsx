import * as React from "react"
import { cn } from "../../lib/utils"
import { X } from "lucide-react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement> {
  as?: "input" | "textarea";
  clearable?: boolean;
  onClear?: () => void;
}

const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  ({ className, type, as = "input", clearable, onClear, value, ...props }, ref) => {
    const Component = as as any;

    return (
      <div className="relative w-full">
        <Component
          type={type}
          value={value}
          className={cn(
            "flex w-full rounded-md border border-white/5 bg-white/5 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 focus-visible:bg-zinc-900/80 disabled:cursor-not-allowed disabled:opacity-50",
            as === "input" ? "h-10 py-2" : "min-h-20 py-3 resize-none custom-scrollbar",
            clearable && as === "input" ? "pr-10" : "",
            className
          )}
          ref={ref}
          {...props}
        />
        {clearable && value && (
          <button
            type="button"
            onClick={onClear}
            className={cn(
              "absolute flex items-center justify-center rounded-full p-1 transition-all",
              as === "input"
                ? "text-zinc-500 hover:text-zinc-300 hover:bg-white/10 right-2 top-1/2 -translate-y-1/2"
                : "right-5 top-1/2 -translate-y-1/2 z-10 shadow-[0_0_10px_rgba(244,63,94,0.2)] bg-rose-500/10 backdrop-blur-md border border-rose-500/30 text-rose-300 hover:bg-rose-500/30 hover:text-rose-100"
            )}
          >
            <X size={14} />
          </button>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
