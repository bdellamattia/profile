import { BottomNav } from "@/components/BottomNav";
import { ClientOnly } from "@/components/ClientOnly";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <main className="mx-auto max-w-md px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-32">
        <ClientOnly>{children}</ClientOnly>
      </main>
      <BottomNav />
    </>
  );
}
