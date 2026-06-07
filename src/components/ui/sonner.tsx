import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={"dark"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-zinc-900/80 group-[.toaster]:!backdrop-blur-3xl group-[.toaster]:!text-zinc-100 group-[.toaster]:!border-white/10 group-[.toaster]:!shadow-[0_0_60px_rgba(0,0,0,0.5)] !rounded-2xl font-sans",
          description: "group-[.toast]:text-zinc-400 text-[13px]",
          actionButton:
            "group-[.toast]:bg-zinc-100 group-[.toast]:text-zinc-900",
          cancelButton:
            "group-[.toast]:bg-zinc-800 group-[.toast]:text-zinc-400",
          success: "group-[.toaster]:!bg-gradient-to-r group-[.toaster]:!from-emerald-500/20 group-[.toaster]:!to-zinc-950/80 group-[.toaster]:!border-emerald-500/40 group-[.toaster]:!text-emerald-100 group-[.toaster]:[&_[data-icon]]:!text-emerald-400",
          error: "group-[.toaster]:!bg-gradient-to-r group-[.toaster]:!from-red-500/20 group-[.toaster]:!to-zinc-950/80 group-[.toaster]:!border-red-500/40 group-[.toaster]:!text-red-100 group-[.toaster]:[&_[data-icon]]:!text-red-400",
          info: "group-[.toaster]:!bg-gradient-to-r group-[.toaster]:!from-indigo-500/20 group-[.toaster]:!to-zinc-950/80 group-[.toaster]:!border-indigo-500/40 group-[.toaster]:!text-indigo-100 group-[.toaster]:[&_[data-icon]]:!text-indigo-400",
          warning: "group-[.toaster]:!bg-gradient-to-r group-[.toaster]:!from-amber-500/20 group-[.toaster]:!to-zinc-950/80 group-[.toaster]:!border-amber-500/40 group-[.toaster]:!text-amber-100 group-[.toaster]:[&_[data-icon]]:!text-amber-400",
          icon: "mt-0.5",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
